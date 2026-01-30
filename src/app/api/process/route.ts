import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiResponse, ProcessResponse, UploadedImage } from '@/types';
import { getJobStore } from '@/lib/jobStore';
import { getImageProvider } from '@/lib/ai/aiImageProviderFactory';

export async function POST(req: NextRequest) {
  try {
    // 동적 import
    const { ImageService } = await import('@/lib/services/imageService');
    const { logger } = await import('@/lib/logger');

    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { images, prompt, imageSize } = body as { 
      images: UploadedImage[]; 
      prompt: string;
      imageSize?: '1K' | '2K';
    };

    if (!images || images.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '처리할 이미지가 없습니다' },
        { status: 400 }
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '프롬프트를 입력해주세요' },
        { status: 400 }
      );
    }

    const imageService = new ImageService();
    const aiService = getImageProvider();

    // 작업 생성
    const jobs = getJobStore();
    const job = imageService.createProcessingJob(images, prompt);
    jobs.set(job.id, job);

    logger.info(`이미지 처리 작업 시작: ${job.id} (${images.length}개)`);

    // 비동기로 이미지 처리 (백그라운드)
    processImagesInBackground(job.id, images, prompt, imageSize || '1K', aiService, imageService);

    return NextResponse.json<ApiResponse<ProcessResponse>>({
      success: true,
      data: {
        jobId: job.id,
        status: 'processing',
        results: [],
      },
      message: '이미지 처리가 시작되었습니다',
    });
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    logger.error('이미지 처리 시작 실패:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '이미지 처리 시작 실패' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // 동적 import
    const { logger } = await import('@/lib/logger');

    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'jobId가 필요합니다' },
        { status: 400 }
      );
    }

    const jobs = getJobStore();
    const job = jobs.get(jobId);
    if (!job) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '작업을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: job,
    });
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    logger.error('작업 조회 실패:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '작업 조회 실패' },
      { status: 500 }
    );
  }
}

// 백그라운드 이미지 처리 함수
async function processImagesInBackground(
  jobId: string,
  images: UploadedImage[],
  prompt: string,
  imageSize: '1K' | '2K',
  aiService: any,
  imageService: any
) {
  const { logger } = await import('@/lib/logger');
  const jobs = getJobStore();
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  logger.info(`=== 이미지 처리 시작: 총 ${images.length}개 ===`);

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    logger.info(`[${i + 1}/${images.length}] 이미지 처리 시작: ${image.filename}`);
    
    // 첫 번째 이미지가 아니면 delay 추가 (rate limit 방지)
    if (i > 0) {
      const delayMs = 2000; // 2초 대기
      logger.info(`Rate limit 방지를 위해 ${delayMs}ms 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // 재시도 로직 (최대 3회)
    let retryCount = 0;
    const maxRetries = 3;
    let result: any = null;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        if (retryCount > 0) {
          // 재시도 시 더 긴 delay (rate limit 방지)
          const retryDelayMs = 5000 * retryCount; // 5초, 10초, 15초
          logger.info(`재시도 ${retryCount}/${maxRetries - 1}: ${retryDelayMs}ms 대기 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }

        logger.info(`[${i + 1}/${images.length}] AI 이미지 처리 시도${retryCount > 0 ? ` (재시도 ${retryCount}/${maxRetries - 1})` : ''}: ${image.filename}`);

        // AI로 이미지 처리
        result = await aiService.processImage(image.path, prompt, imageSize);
        lastError = null;
        break; // 성공 시 루프 종료
      } catch (error: any) {
        lastError = error;
        retryCount++;
        
        // rate limit 에러인지 확인
        const isRateLimitError = 
          error.message?.includes('rate limit') ||
          error.message?.includes('Rate limit') ||
          error.message?.includes('429') ||
          error.status === 429 ||
          error.response?.status === 429;

        if (isRateLimitError && retryCount < maxRetries) {
          logger.warn(`Rate limit 오류 발생 (${retryCount}/${maxRetries - 1}): ${error.message}`);
          // rate limit이면 계속 재시도
          continue;
        } else if (retryCount < maxRetries) {
          // 다른 에러도 재시도
          logger.warn(`이미지 처리 오류 발생 (${retryCount}/${maxRetries - 1}): ${error.message}`);
          continue;
        } else {
          // 최대 재시도 횟수 초과 - 에러를 throw하지 않고 다음 이미지로 넘어감
          logger.error(`이미지 처리 최종 실패 (재시도 ${retryCount}회 모두 실패): ${image.filename}`, error);
          break; // while 루프 종료하고 다음 이미지로
        }
      }
    }

    // 성공한 경우에만 처리
    if (result) {
      try {
        // 첫 번째 처리 시 v1 버전 번호 추가
        const fs = require('fs').promises;
        const fsSync = require('fs');
        const path = require('path');
        const { config } = require('@/lib/config');
        
        let finalPath = result.resultPath;
        const originalFilename = path.basename(result.resultPath);
        const ext = path.extname(originalFilename);
        const basename = path.basename(originalFilename, ext);
        
        // v1 파일명으로 변경
        const v1Filename = `${basename}-v1${ext}`;
        const v1Path = path.join(config.resultDir, v1Filename);
        
        try {
          // AI가 생성한 파일을 v1로 변경
          if (fsSync.existsSync(result.resultPath)) {
            await fs.rename(result.resultPath, v1Path);
            finalPath = v1Path;
            logger.info(`첫 번째 처리 결과를 v1로 저장: ${originalFilename} -> ${v1Filename}`);
          }
        } catch (error) {
          logger.error(`v1 파일명 변경 실패: ${error}`);
          // 실패하면 원본 경로 사용
        }

        // 처리된 이미지 메타데이터 생성
        const processedImage = imageService.createProcessedImage(
          image.id,
          finalPath,
          prompt,
          'completed'
        );

        // 토큰 정보 추가
        if (result.tokens) {
          processedImage.tokens = result.tokens;
        }

        job.results.push(processedImage);
        job.processedCount++;

        logger.info(`이미지 처리 완료: ${image.filename}${retryCount > 0 ? ` (재시도 ${retryCount}회 후 성공)` : ''}`);
      } catch (error) {
        logger.error(`이미지 후처리 실패: ${image.filename}`, error);
        // 후처리 실패도 실패로 처리
        const processedImage = imageService.createProcessedImage(
          image.id,
          '',
          prompt,
          'failed',
          error instanceof Error ? error.message : '후처리 실패'
        );
        job.results.push(processedImage);
        job.failedCount++;
      }
    } else {
      // 재시도 모두 실패한 경우
      logger.error(`이미지 처리 최종 실패: ${image.filename} (재시도 ${maxRetries}회 모두 실패)`);

      // 실패한 이미지도 결과에 추가
      const processedImage = imageService.createProcessedImage(
        image.id,
        '',
        prompt,
        'failed',
        lastError?.message || '알 수 없는 오류'
      );

      job.results.push(processedImage);
      job.failedCount++;
    }
  }

  // 작업 완료
  job.status = job.failedCount === 0 ? 'completed' : 'partial';
  job.completedAt = new Date().toISOString();

  logger.info(`작업 완료: ${jobId} (성공: ${job.processedCount}, 실패: ${job.failedCount})`);
}

