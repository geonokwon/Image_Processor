import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProcessedImage } from '@/types';

export async function POST(req: NextRequest) {
  try {
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

    const { image } = await req.json() as { 
      image: ProcessedImage;
    };

    if (!image || !image.path) {
      return NextResponse.json(
        { success: false, error: '이미지 정보가 없습니다' },
        { status: 400 }
      );
    }

    if (image.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '완료된 이미지만 다운로드할 수 있습니다' },
        { status: 400 }
      );
    }

    if (!fsSync.existsSync(image.path)) {
      return NextResponse.json(
        { success: false, error: '파일을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    logger.info(`개별 이미지 다운로드: ${image.filename}`);

    // 파일 읽기
    const fileBuffer = await fs.readFile(image.path);

    // MIME 타입 결정
    const ext = path.extname(image.filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 파일명 정리 (특수문자 제거)
    const safeFilename = image.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    const { logger } = require('@/lib/logger');
    logger.error('개별 이미지 다운로드 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message || '다운로드 실패' },
      { status: 500 }
    );
  }
}

