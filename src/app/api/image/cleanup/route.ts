import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UploadedImage, ProcessedImage, ApiResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No body' },
        { status: 400 },
      );
    }

    const { uploadedImages, processedImages } = JSON.parse(rawBody) as {
      uploadedImages?: UploadedImage[];
      processedImages?: ProcessedImage[];
    };

    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { config } = require('@/lib/config');
    const { logger } = require('@/lib/logger');

    // results 폴더와 originals 폴더의 모든 이미지 삭제
    const filesToDelete = new Set<string>();

    // 처리된 이미지와 히스토리 파일들 추가
    if (processedImages) {
      for (const img of processedImages) {
        if (img.path) {
          filesToDelete.add(img.path);
        } else if (img.filename) {
          filesToDelete.add(path.join(config.resultDir, img.filename));
        }
        
        // 히스토리 파일들도 추가
        if (img.history) {
          for (const version of img.history) {
            if (version.path) {
              filesToDelete.add(version.path);
            } else if (version.filename) {
              filesToDelete.add(path.join(config.resultDir, version.filename));
            }
          }
        }
      }
    }
    
    // 업로드된 원본 이미지 파일들 추가
    if (uploadedImages && uploadedImages.length > 0) {
      for (const uploadedImg of uploadedImages) {
        if (uploadedImg.path) {
          filesToDelete.add(uploadedImg.path);
        }
      }
    }
    
    // results 폴더의 모든 파일 삭제 (임시 파일 포함)
    try {
      if (fsSync.existsSync(config.resultDir)) {
        const resultFiles = await fs.readdir(config.resultDir);
        for (const file of resultFiles) {
          const filePath = path.join(config.resultDir, file);
          filesToDelete.add(filePath);
        }
      }
    } catch (err) {
      logger.warn(`[cleanup] results 폴더 읽기 실패:`, err);
    }
    
    // originals 폴더의 모든 파일 삭제
    try {
      if (fsSync.existsSync(config.uploadDir)) {
        const originalFiles = await fs.readdir(config.uploadDir);
        for (const file of originalFiles) {
          const filePath = path.join(config.uploadDir, file);
          filesToDelete.add(filePath);
        }
      }
    } catch (err) {
      logger.warn(`[cleanup] originals 폴더 읽기 실패:`, err);
    }

    // 파일 삭제 실행
    for (const filePath of filesToDelete) {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
          logger.info(`[cleanup] 삭제: ${filePath}`);
        }
      } catch (err) {
        logger.warn(`[cleanup] 삭제 실패: ${filePath}`, err);
      }
    }

    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error: any) {
    const { logger } = await import('@/lib/logger');
    logger.error('cleanup 실패:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'cleanup 실패' },
      { status: 500 },
    );
  }
}


