import path from 'path';
import fs from 'fs';

if (typeof window !== 'undefined') {
  throw new Error('presetService는 서버에서만 사용할 수 있습니다');
}

export class PresetService {
  private presetFilePath: string;

  constructor() {
    this.presetFilePath = path.join(process.cwd(), 'data', 'presets.json');
  }

  async getPresets(): Promise<any[]> {
    const fsSync = require('fs');
    const { logger } = require('@/lib/logger');

    if (!fsSync.existsSync(path.dirname(this.presetFilePath))) {
      fsSync.mkdirSync(path.dirname(this.presetFilePath), { recursive: true });
    }

    try {
      if (!fsSync.existsSync(this.presetFilePath)) {
        logger.warn('프리셋 파일이 없습니다. 기본값 반환.');
        return [];
      }

      const content = await fs.promises.readFile(this.presetFilePath, 'utf-8');
      const presets = JSON.parse(content);
      logger.info('프리셋 불러오기 성공');
      return Array.isArray(presets) ? presets : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn('프리셋 파일이 없습니다. 기본값 반환.');
        return [];
      }
      logger.error(`프리셋 불러오기 실패: ${error.message}`, error);
      throw new Error(`프리셋 불러오기 실패: ${error.message}`);
    }
  }

  async savePresets(presets: any[]): Promise<void> {
    const fsSync = require('fs');
    const { logger } = require('@/lib/logger');

    if (!fsSync.existsSync(path.dirname(this.presetFilePath))) {
      fsSync.mkdirSync(path.dirname(this.presetFilePath), { recursive: true });
    }

    try {
      await fs.promises.writeFile(this.presetFilePath, JSON.stringify(presets, null, 2), 'utf-8');
      logger.info('프리셋 저장 성공');
    } catch (error: any) {
      logger.error(`프리셋 저장 실패: ${error.message}`, error);
      throw new Error(`프리셋 저장 실패: ${error.message}`);
    }
  }
}
