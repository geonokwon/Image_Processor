import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiResponse, ProcessedImage, ProcessedImageVersion } from '@/types';
import { getImageProvider } from '@/lib/ai/aiImageProviderFactory';
import { logger } from '@/lib/logger';
import { ImageService } from '@/lib/services/imageService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // catch 블록에서도 사용하기 위해 try 블록 밖에서 선언
  let currentProcessedImage: ProcessedImage | undefined;
  
  try {
    // Next.js 15에서는 params가 Promise
    const { id } = await params;

    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageId, imagePath, prompt, currentProcessedImage: currentImage } = body;
    currentProcessedImage = currentImage;

    if (!imageId || !imagePath || !prompt) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    const aiService = getImageProvider();
    const imageService = new ImageService();
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { config } = require('@/lib/config');

    logger.info(`이미지 재처리 시작: ${imageId}`);

    // 이전 버전을 히스토리에 저장
    let history: ProcessedImageVersion[] = [];
    let currentVersionNumber = 1; // 기본 버전 번호
    let originalBasename = '';

    // 먼저 원본 파일명 추출
    const originalFilename = path.basename(imagePath);
    const originalExt = path.extname(originalFilename);
    originalBasename = path.basename(originalFilename, originalExt);

    if (currentProcessedImage && currentProcessedImage.status === 'completed' && currentProcessedImage.path) {
      // 기존 히스토리 가져오기
      if (currentProcessedImage.history) {
        history = [...currentProcessedImage.history];
      }

      // 현재 파일명에서 버전 번호 추출
      const currentFilename = currentProcessedImage.filename;
      const ext = path.extname(currentFilename);
      const basenameWithoutExt = path.basename(currentFilename, ext);
      
      // 버전 번호 패턴 찾기 (예: 이미지_1-v1.png -> v1 추출)
      const versionMatch = basenameWithoutExt.match(/-v(\d+)$/);
      if (versionMatch) {
        currentVersionNumber = parseInt(versionMatch[1], 10);
        originalBasename = basenameWithoutExt.replace(/-v\d+$/, '');
      } else {
        // 버전 번호가 없으면 v1로 변경
        originalBasename = basenameWithoutExt;
        currentVersionNumber = 1;
        
        // 기존 파일을 v1으로 변경
        const v1Filename = `${originalBasename}-v1${ext}`;
        const v1Path = path.join(config.resultDir, v1Filename);
        
        try {
          if (fsSync.existsSync(currentProcessedImage.path) && currentProcessedImage.path !== v1Path) {
            await fs.rename(currentProcessedImage.path, v1Path);
            currentProcessedImage.filename = v1Filename;
            currentProcessedImage.path = v1Path;
            logger.info(`기존 파일을 v1로 변경: ${currentFilename} -> ${v1Filename}`);
          }
        } catch (error) {
          logger.error(`v1 파일명 변경 실패: ${error}`);
        }
      }

      // 현재 버전을 히스토리에 추가
      if (fsSync.existsSync(currentProcessedImage.path)) {
        const previousVersion: ProcessedImageVersion = {
          id: currentProcessedImage.id,
          filename: currentProcessedImage.filename,
          path: currentProcessedImage.path,
          prompt: currentProcessedImage.prompt,
          processedAt: currentProcessedImage.processedAt || new Date().toISOString(),
          tokens: currentProcessedImage.tokens,
        };
        history.push(previousVersion);
        logger.info(`이전 버전을 히스토리에 추가: ${currentProcessedImage.filename}`);
      }
    }

    // 원본 이미지 파일 존재 확인
    if (!fsSync.existsSync(imagePath)) {
      logger.error(`원본 이미지 파일이 존재하지 않음: ${imagePath}`);
      return NextResponse.json<ApiResponse>(
        { success: false, error: '원본 이미지 파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // AI로 이미지 재처리 (기본값 1K 사용)
    logger.info(`AI 이미지 처리 시작: ${imagePath}, 프롬프트: ${prompt.substring(0, 50)}...`);
    const result = await aiService.processImage(imagePath, prompt, '1K');

    // AI가 생성한 파일을 새 버전 번호로 변경
    const newVersionNumber = currentVersionNumber + 1;
    const ext = path.extname(result.resultPath);
    const newFilename = `${originalBasename}-v${newVersionNumber}${ext}`;
    const newPath = path.join(config.resultDir, newFilename);

    // 파일명 변경: AI가 생성한 파일을 새 버전으로 저장
    try {
      if (fsSync.existsSync(result.resultPath)) {
        await fs.rename(result.resultPath, newPath);
        logger.info(`새 버전 파일 저장: ${result.resultPath} -> ${newFilename}`);
      } else {
        logger.error(`AI가 생성한 파일을 찾을 수 없음: ${result.resultPath}`);
      }
    } catch (error) {
      logger.error(`파일명 변경 실패: ${error}`);
      throw error;
    }

    // 처리된 이미지 메타데이터 생성
    const processedImage = imageService.createProcessedImage(
      imageId,
      newPath,
      prompt,
      'completed'
    );

    // 히스토리 추가
    processedImage.history = history;

    // 토큰 정보 추가
    if (result.tokens) {
      processedImage.tokens = result.tokens;
      logger.info(`재처리 토큰 정보 저장: ${JSON.stringify(result.tokens)}`);
    } else {
      logger.warn(`재처리 토큰 정보 없음: ${imageId}`);
    }

    logger.info(`이미지 재처리 완료: ${imageId} (히스토리 ${history.length}개)`);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: processedImage,
      message: '이미지가 재처리되었습니다',
    });
  } catch (error: any) {
    logger.error('이미지 재처리 실패:', error);
    
    // 에러 메시지 파싱 (JSON 문자열인 경우)
    let errorMessage = '이미지 재처리 실패';
    try {
      if (error.message) {
        // JSON 문자열로 감싸진 에러 메시지 파싱 시도
        const parsedError = JSON.parse(error.message);
        if (parsedError.error?.message) {
          errorMessage = parsedError.error.message;
        } else if (typeof parsedError === 'string') {
          errorMessage = parsedError;
        } else {
          errorMessage = error.message;
        }
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    } catch (parseError) {
      // 파싱 실패 시 원본 메시지 사용
      errorMessage = error.message || error.toString() || '이미지 재처리 실패';
    }
    
    // 실패한 이미지 상태로 복원 시도
    if (currentProcessedImage) {
      logger.info('재처리 실패로 인해 이전 상태로 복원');
    }
    
    return NextResponse.json<ApiResponse>(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

