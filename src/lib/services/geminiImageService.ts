import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { config as appConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export class GeminiImageService {
  private client: any;

  private async initClient() {
    if (this.client) return this.client;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY(or GOOGLE_API_KEY)가 설정되어 있지 않습니다.',
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  async processImage(imagePath: string, prompt: string, imageSize: '1K' | '2K' = '1K'): Promise<{ resultPath: string; tokens?: { promptTokens?: number; totalTokens?: number } }> {
    const client = await this.initClient();
    const imageBuffer = await fs.readFile(imagePath);
    const mimeType = this.getMimeType(imagePath);
    
    const originalFilename = path.basename(imagePath);
    const basename = path.basename(originalFilename, path.extname(originalFilename));
    
    // Gemini 3 Pro Image Preview 또는 Imagen 모델 사용
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';
    
    // 사용자 프롬프트가 없으면 기본 편집 프롬프트 사용
    const effectivePrompt = prompt && prompt.trim().length > 0
      ? prompt.trim()
      : '원본 사진과 최대한 비슷하게 유지하면서, 더 먹음직스럽고 고품질로 보이도록 색감과 조명만 자연스럽게 보정해줘.';

    try {
      const isImagenModel = model.startsWith('imagen-');
      let outputBase64: string | undefined;
      let tokens: { promptTokens?: number; totalTokens?: number } | undefined;

      if (isImagenModel) {
        // Imagen 모델: generateImages 사용
        const config: any = {
          numberOfImages: 1,
          aspectRatio: '1:1',
          imageSize: imageSize, // 1K 또는 2K
        };

        const result = await client.models.generateImages({
          model,
          prompt: effectivePrompt,
          config,
        });

        const generatedImage = result.generatedImages?.[0];
        if (!generatedImage?.image?.imageBytes) {
          throw new Error('Gemini Imagen이 이미지를 생성하지 않았습니다.');
        }

        outputBase64 = generatedImage.image.imageBytes;
        
        // Imagen API는 토큰 정보를 제공하지 않을 수 있음
        if (result.usageMetadata) {
          tokens = {
            promptTokens: result.usageMetadata.promptTokenCount,
            totalTokens: result.usageMetadata.totalTokenCount,
          };
        }
      } else {
        // gemini-3-pro-image-preview: generateContentStream 사용 (멀티모달)
        const config = {
          responseModalities: ['IMAGE', 'TEXT'] as const,
        };

        const contents = [
          {
            role: 'user' as const,
            parts: [
              {
                text: effectivePrompt,
              },
              {
                inlineData: {
                  mimeType,
                  data: imageBuffer.toString('base64'),
                },
              },
            ],
          },
        ];

        const response = await client.models.generateContentStream({
          model,
          config,
          contents,
        });

        // 스트림에서 이미지 및 토큰 정보 추출
        for await (const chunk of response) {
          // 토큰 정보 추출 (마지막 chunk에 최종 토큰 정보가 올 수 있으므로 계속 업데이트)
          if (chunk.usageMetadata) {
            tokens = {
              promptTokens: chunk.usageMetadata.promptTokenCount,
              totalTokens: chunk.usageMetadata.totalTokenCount,
            };
            logger.info(`토큰 정보 추출: ${JSON.stringify(tokens)}`);
          }

          if (!chunk.candidates || !chunk.candidates[0]?.content?.parts) {
            continue;
          }

          // 이미지 데이터 찾기
          const inlineData = chunk.candidates[0].content.parts.find(
            (part: any) => part.inlineData?.data
          )?.inlineData;

          if (inlineData?.data) {
            outputBase64 = inlineData.data;
          }
        }

        // 최종 토큰 정보 로그
        if (tokens) {
          logger.info(`최종 토큰 사용량: promptTokens=${tokens.promptTokens}, totalTokens=${tokens.totalTokens}`);
        } else {
          logger.warn('토큰 정보를 찾을 수 없습니다.');
        }
      }

      if (!outputBase64) {
        throw new Error('Gemini가 이미지를 생성하지 않았습니다.');
      }

      // 저장
      const buffer: Buffer = Buffer.from(outputBase64, 'base64') as Buffer;
      const ext = '.png';
      const resultFilename = `${basename}${ext}`;
      const resultPath = path.join(appConfig.resultDir, resultFilename);

      if (!existsSync(appConfig.resultDir)) {
        mkdirSync(appConfig.resultDir, { recursive: true });
      }

      await fs.writeFile(resultPath, buffer);
      
      return { resultPath, tokens };

    } catch (error: any) {
      logger.error('Gemini 이미지 처리 실패:', error);
      // Gemini API 에러 상세 로깅
      if (error.response) {
        logger.error('Gemini API 응답:', error.response);
      }
      if (error.message) {
        logger.error('에러 메시지:', error.message);
      }
      // 원본 에러를 그대로 throw하여 상위에서 처리할 수 있도록
      throw error;
    }
  }

  private getMimeType(filePath: string): string {
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
