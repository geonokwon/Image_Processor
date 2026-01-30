import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProcessedImage, UploadedImage } from '@/types';
import { config } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    // 동적 import
    const archiver = (await import('archiver')).default;
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const { logger } = require('@/lib/logger');
    const path = require('path');

    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { images, uploadedImages } = await req.json() as { 
      images: ProcessedImage[];
      uploadedImages?: UploadedImage[];
    };

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: '다운로드할 이미지가 없습니다' },
        { status: 400 }
      );
    }

    logger.info(`ZIP 생성 시작: ${images.length}개 이미지`);

    // ZIP 아카이브 생성
    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축
    });

    // 스트림 설정
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    archive.on('error', (err) => {
      throw err;
    });

    // 이미지 파일들을 ZIP에 추가
    for (const image of images) {
      if (image.status === 'completed' && fsSync.existsSync(image.path)) {
        let filename = image.filename;

        // 가능하면 원본 업로드 이름을 사용 (확장자 포함)
        if (uploadedImages && uploadedImages.length > 0) {
          const original = uploadedImages.find(
            (u: UploadedImage) => u.id === image.originalImageId,
          );
          if (original?.originalName) {
            filename = original.originalName;
          }
        }

        // ZIP 안에 동일한 이름이 여러 번 들어가는 것을 방지하기 위해, 중복 시 간단히 접미사 추가
        const base = path.basename(filename, path.extname(filename));
        const ext = path.extname(filename) || '.png';
        let finalName = filename;
        let counter = 1;
        while ((archive as any)._entries && (archive as any)._entries[finalName]) {
          finalName = `${base}(${counter})${ext}`;
          counter += 1;
        }

        archive.file(image.path, { 
          name: finalName,
          mode: 0o644 // 모든 사용자가 읽기 가능하도록 권한 강제
        });
      }
    }

    // ZIP 완료
    await archive.finalize();

    // Buffer 생성
    const buffer = Buffer.concat(chunks);

    logger.info(`ZIP 생성 완료: ${buffer.length} bytes`);

    // 다운로드 완료 후 results 폴더와 originals 폴더의 모든 이미지 삭제
    logger.info(`이미지 파일 삭제 시작`);
    
    // 처리된 이미지와 히스토리 파일들 삭제
    const filesToDelete = new Set<string>();
    
    // 처리된 이미지 파일들 추가
    for (const img of images) {
      if (img.path && img.status === 'completed') {
        filesToDelete.add(img.path);
      }
      
      // 히스토리 파일들도 추가
      if (img.history) {
        for (const version of img.history) {
          if (version.path) {
            filesToDelete.add(version.path);
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
      logger.error(`results 폴더 읽기 실패:`, err);
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
      logger.error(`originals 폴더 읽기 실패:`, err);
    }
    
    // 파일 삭제 실행
    for (const filePath of filesToDelete) {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
          logger.info(`이미지 삭제: ${filePath}`);
        }
      } catch (err) {
        logger.warn(`이미지 삭제 실패: ${filePath}`, err);
      }
    }
    
    logger.info(`이미지 파일 삭제 완료 (${filesToDelete.size}개)`);

    // ZIP 파일 다운로드 응답
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="processed_images_${Date.now()}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    const { logger } = require('@/lib/logger');
    logger.error('ZIP 다운로드 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ZIP 다운로드 실패' },
      { status: 500 }
    );
  }
}

