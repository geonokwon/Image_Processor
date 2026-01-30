import { config } from '@/lib/config';
import { AIImageService } from '@/lib/services/aiImageService';
import { GeminiImageService } from '@/lib/services/geminiImageService';

export interface ImageProvider {
  processImage(imagePath: string, prompt: string, imageSize?: '1K' | '2K'): Promise<{ resultPath: string; tokens?: { promptTokens?: number; totalTokens?: number } }>;
}

/**
 * AI 이미지 프로바이더 팩토리
 * - openai: gpt-image-1 기반 편집/생성
 * - gemini: 향후 Google Gemini 이미지 API 구현용 자리
 */
export function getImageProvider(): ImageProvider {
  switch (config.aiProvider) {
    case 'gemini':
      return new GeminiImageService();
    case 'openai':
    default:
      return new AIImageService();
  }
}



