import { UploadedImage, ProcessedImage, ProcessingJob } from '@/types';

// 서버 사이드 전용
if (typeof window !== 'undefined') {
  throw new Error('imageService는 서버에서만 사용할 수 있습니다');
}

export class ImageService {
  /**
   * 업로드된 파일을 저장하고 메타데이터 반환
   */
  async saveUploadedImage(
    file: File,
    buffer: Buffer
  ): Promise<UploadedImage> {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    const { config } = require('@/lib/config');
    const { logger } = require('@/lib/logger');

    const id = uuidv4();
    // 원본 파일명 그대로 사용
    const filename = file.name;
    const filepath = path.join(config.uploadDir, filename);

    // 업로드 디렉토리 생성
    if (!fsSync.existsSync(config.uploadDir)) {
      fsSync.mkdirSync(config.uploadDir, { recursive: true });
    }

    // 파일 저장
    await fs.writeFile(filepath, buffer);

    logger.info(`이미지 저장 완료: ${filename}`);

    return {
      id,
      filename,
      originalName: file.name,
      path: filepath,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * 이미지 파일 읽기
   */
  async readImage(imagePath: string): Promise<Buffer> {
    const fs = require('fs').promises;
    return await fs.readFile(imagePath);
  }

  /**
   * 이미지 존재 여부 확인
   */
  async imageExists(imagePath: string): Promise<boolean> {
    const fsSync = require('fs');
    return fsSync.existsSync(imagePath);
  }

  /**
   * 이미지 삭제
   */
  async deleteImage(imagePath: string): Promise<void> {
    const fs = require('fs').promises;
    const { logger } = require('@/lib/logger');
    
    if (await this.imageExists(imagePath)) {
      await fs.unlink(imagePath);
      logger.info(`이미지 삭제 완료: ${imagePath}`);
    }
  }

  /**
   * 처리된 이미지 메타데이터 생성
   */
  createProcessedImage(
    originalImageId: string,
    resultPath: string,
    prompt: string,
    status: ProcessedImage['status'] = 'completed',
    error?: string
  ): ProcessedImage {
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    return {
      id: uuidv4(),
      originalImageId,
      filename: path.basename(resultPath),
      path: resultPath,
      prompt,
      status,
      processedAt: status === 'completed' ? new Date().toISOString() : undefined,
      error,
    };
  }

  /**
   * 처리 작업 생성
   */
  createProcessingJob(
    images: UploadedImage[],
    prompt: string
  ): ProcessingJob {
    const { v4: uuidv4 } = require('uuid');
    
    return {
      id: uuidv4(),
      images,
      prompt,
      results: [],
      status: 'pending',
      totalImages: images.length,
      processedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 업로드 디렉토리 정리 (오래된 파일 삭제)
   */
  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      const path = require('path');
      const { config } = require('@/lib/config');
      const { logger } = require('@/lib/logger');
      
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      const dirs = [config.uploadDir, config.resultDir];

      for (const dir of dirs) {
        if (!fsSync.existsSync(dir)) continue;

        const files = await fs.readdir(dir);

        for (const file of files) {
          const filepath = path.join(dir, file);
          const stats = await fs.stat(filepath);

          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filepath);
            logger.info(`오래된 파일 삭제: ${filepath}`);
          }
        }
      }
    } catch (error: any) {
      const { logger } = require('@/lib/logger');
      logger.error(`파일 정리 실패: ${error.message}`, error);
    }
  }
}

