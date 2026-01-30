import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiResponse, UploadResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // 동적 import (서버에서만 실행)
    const { ImageService } = await import('@/lib/services/imageService');
    const { logger } = await import('@/lib/logger');
    const { config } = await import('@/lib/config');

    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '이미지 파일이 없습니다' },
        { status: 400 }
      );
    }

    // 파일 개수 제한 확인
    if (files.length > config.maxFiles) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `최대 ${config.maxFiles}개까지 업로드 가능합니다` },
        { status: 400 }
      );
    }

    const imageService = new ImageService();
    const uploadedImages = [];

    for (const file of files) {
      // 파일 크기 확인
      if (file.size > config.maxFileSize) {
        logger.warn(`파일 크기 초과: ${file.name} (${file.size} bytes)`);
        continue;
      }

      // MIME 타입 확인
      if (!config.allowedMimeTypes.includes(file.type)) {
        logger.warn(`지원하지 않는 파일 형식: ${file.name} (${file.type})`);
        continue;
      }

      // 파일 저장
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadedImage = await imageService.saveUploadedImage(file, buffer);
      uploadedImages.push(uploadedImage);
    }

    if (uploadedImages.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '업로드 가능한 이미지가 없습니다' },
        { status: 400 }
      );
    }

    logger.info(`${uploadedImages.length}개 이미지 업로드 완료`);

    return NextResponse.json<ApiResponse<UploadResponse>>({
      success: true,
      data: {
        images: uploadedImages,
        jobId: '', // 아직 작업은 생성하지 않음
      },
      message: `${uploadedImages.length}개 이미지 업로드 완료`,
    });
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    logger.error('이미지 업로드 실패:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '이미지 업로드 실패' },
      { status: 500 }
    );
  }
}

