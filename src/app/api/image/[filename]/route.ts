import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Node.js 내장 모듈
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const path = require('path');
    const { config } = require('@/lib/config');

    // 임시로 인증 체크 비활성화 (디버깅용)
    /*
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    */

    // Next.js 15에서는 params가 Promise
    const { filename: rawFilename } = await params;
    
    // 브라우저가 자동으로 인코딩하므로 디코딩 불필요
    let filename = rawFilename;
    
    console.log('🖼️ [IMAGE API] 요청된 파일명:', filename);

    // 파일 경로 확인 (업로드 또는 결과 디렉토리)
    const uploadPath = path.join(config.uploadDir, filename);
    const resultPath = path.join(config.resultDir, filename);
    
    console.log('📁 [IMAGE API] 경로 확인:', { uploadPath, resultPath });

    let filePath: string;
    if (fsSync.existsSync(uploadPath)) {
      filePath = uploadPath;
      console.log('✅ [IMAGE API] 파일 찾음 (업로드):', uploadPath);
    } else if (fsSync.existsSync(resultPath)) {
      filePath = resultPath;
      console.log('✅ [IMAGE API] 파일 찾음 (결과):', resultPath);
    } else {
      console.error('❌ [IMAGE API] 파일 없음:', filename);
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // 파일 읽기
    const fileBuffer = await fs.readFile(filePath);
    
    // MIME 타입 결정
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';

    // 이미지 응답
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('이미지 로드 오류:', error);
    return NextResponse.json(
      { success: false, error: '이미지 로드 실패' },
      { status: 500 }
    );
  }
}

