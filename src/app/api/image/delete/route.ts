import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { imageId, filename } = await req.json();

    if (!imageId || !filename) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'imageId와 filename이 필요합니다' },
        { status: 400 }
      );
    }

    const { ImageService } = await import('@/lib/services/imageService');
    const { config } = await import('@/lib/config');
    const { logger } = await import('@/lib/logger');

    const imageService = new ImageService();
    const path = require('path');
    const fsSync = require('fs');

    // 원본 이미지 삭제
    const originalPath = path.join(config.uploadDir, filename);
    await imageService.deleteImage(originalPath);

    // 해당 원본에서 생성된 처리 결과들도 함께 삭제
    const basename = path.basename(filename, path.extname(filename));
    const resultDir = config.resultDir;

    if (fsSync.existsSync(resultDir)) {
      const files: string[] = fsSync.readdirSync(resultDir);
      for (const file of files) {
        if (file.startsWith(`${basename}_processed`)) {
          const resultPath = path.join(resultDir, file);
          await imageService.deleteImage(resultPath);
        }
      }
    }

    logger.info(`이미지 및 결과 삭제 완료: ${filename} (imageId: ${imageId})`);

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '이미지가 삭제되었습니다',
    });
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    logger.error('이미지 삭제 실패:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '이미지 삭제 실패' },
      { status: 500 }
    );
  }
}



