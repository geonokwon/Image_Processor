// 서버 사이드 전용
if (typeof window !== 'undefined') {
  throw new Error('aiImageService는 서버에서만 사용할 수 있습니다');
}

export class AIImageService {
  private client: any;

  private async initClient() {
    if (this.client) return this.client;

    const OpenAI = (await import('openai')).default;
    const { config } = await import('@/lib/config');

    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
    });

    return this.client;
  }

  async processImage(imagePath: string, prompt: string, imageSize?: '1K' | '2K'): Promise<{ resultPath: string; tokens?: { promptTokens?: number; totalTokens?: number } }> {
    const fs = require('fs').promises; // 파일 읽기 및 saveBase64Image 등에 사용
    const fsSync = require('fs');
    const path = require('path');
    const { logger } = require('@/lib/logger');
    const { config } = require('@/lib/config');

    try {
      const client = await this.initClient();

      logger.info(`AI 이미지 처리 시작 (편집 모드): ${imagePath}`);

      const primaryModel = config.imageModel || 'gpt-image-1';

      // gpt-image-1 편집 엔드포인트를 사용해서, 원본 이미지를 직접 편집
      // - image: FileLike (toFile 헬퍼로 생성, MIME 타입까지 명시)
      // - prompt: 사용자가 입력한 프롬프트 그대로 (비전용 프롬프트는 사용하지 않음)
      const imageBuffer = await fs.readFile(imagePath);
      const extMime = this.getMimeType(imagePath);
      const { toFile } = await import('openai/uploads');
      const imageFile = await toFile(imageBuffer, path.basename(imagePath), {
        type: extMime,
      });

      const effectivePrompt =
        prompt && prompt.trim().length > 0
          ? prompt.trim()
          : '원본 사진과 최대한 비슷하게 유지하면서, 음식이 더 먹음직스럽게 보이도록 색감과 조명만 자연스럽게 보정해줘.';

      logger.info('=== gpt-image-1 편집 프롬프트 ===');
      logger.info(effectivePrompt);
      logger.info('==============================');

      const imageResponse = await client.images.edit({
        model: primaryModel,
        image: imageFile,
        prompt: effectivePrompt,
        size: '1024x1024',
        quality: 'high',
      });

      const imageData = imageResponse.data[0] as any;
      const editedImageBase64 = imageData?.b64_json as string | undefined;

      if (!editedImageBase64) {
        throw new Error('AI가 이미지를 생성하지 못했습니다');
      }

      const resultImagePath = await this.saveBase64Image(
        editedImageBase64,
        imagePath,
      );

      logger.info(`AI 처리 완료: ${resultImagePath}`);

      // OpenAI는 토큰 정보를 별도로 제공하지 않으므로 null 반환
      return { resultPath: resultImagePath };
    } catch (error: any) {
      logger.error(`AI 이미지 처리 실패: ${error.message}`, error);
      throw new Error(`AI 처리 실패: ${error.message}`);
    }
  }

  /**
   * URL에서 이미지를 다운로드하여 저장
   */
  private async downloadImage(url: string, originalPath: string): Promise<string> {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { config } = require('@/lib/config');
    const { logger } = require('@/lib/logger');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const originalFilename = path.basename(originalPath);
    const ext = path.extname(originalFilename) || '.png';
    const basename = path.basename(originalFilename, ext);

    // 타임스탬프를 붙여서 항상 새로운 파일로 저장
    const timestamp = Date.now();
    const resultFilename = `${basename}_processed_${timestamp}${ext}`;
    const resultPath = path.join(config.resultDir, resultFilename);

    if (!fsSync.existsSync(config.resultDir)) {
      fsSync.mkdirSync(config.resultDir, { recursive: true });
    }

    await fs.writeFile(resultPath, Buffer.from(buffer));

    logger.info('=== 처리 결과 저장 ===');
    logger.info(`파일명: ${resultFilename}`);
    logger.info(`경로: ${resultPath}`);
    logger.info('=====================');

    return resultPath;
  }

  /**
   * base64 JSON으로 받은 이미지를 저장
   */
  private async saveBase64Image(
    b64Json: string,
    originalPath: string,
  ): Promise<string> {
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { config } = require('@/lib/config');
    const { logger } = require('@/lib/logger');

    const buffer = Buffer.from(b64Json, 'base64');

    const originalFilename = path.basename(originalPath);
    const ext = path.extname(originalFilename) || '.png';
    const basename = path.basename(originalFilename, ext);

    const timestamp = Date.now();
    const resultFilename = `${basename}_processed_${timestamp}${ext}`;
    const resultPath = path.join(config.resultDir, resultFilename);

    if (!fsSync.existsSync(config.resultDir)) {
      fsSync.mkdirSync(config.resultDir, { recursive: true });
    }

    await fs.writeFile(resultPath, buffer);

    logger.info('=== 처리 결과 저장 (base64) ===');
    logger.info(`파일명: ${resultFilename}`);
    logger.info(`경로: ${resultPath}`);
    logger.info('=============================');

    return resultPath;
  }

  /**
   * 파일 경로에서 MIME 타입 추출
   */
  private getMimeType(filePath: string): string {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

