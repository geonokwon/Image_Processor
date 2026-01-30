import path from 'path';
import { AppConfig } from '@/types';

function getConfig(): AppConfig {
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'originals');
  const resultDir = process.env.RESULT_DIR || path.join(process.cwd(), 'uploads', 'results');

  return {
    uploadDir,
    resultDir,
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxFiles: parseInt(process.env.MAX_FILES || '50', 10),
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    // 기본 텍스트/비전 모델: GPT‑5.0 (환경변수로 gpt-4o 등으로 교체 가능)
    openaiModel: process.env.OPENAI_MODEL || 'gpt-5',
    // 기본 이미지 생성 모델: 2025년 기준 권장값 gpt-image-1 (권한 없으면 코드에서 dall-e-3로 폴백)
    imageModel: process.env.IMAGE_MODEL || 'gpt-image-1',
    // AI 프로바이더 (향후 gemini 등으로 교체 가능)
    aiProvider: (process.env.AI_PROVIDER as 'openai' | 'gemini') || 'openai',
  };
}

export const config = getConfig();

