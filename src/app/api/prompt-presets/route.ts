import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiResponse, PromptPreset } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { PromptPresetService } = await import('@/lib/services/promptPresetService');
    const presetService = new PromptPresetService();

    const presets = await presetService.getPresets();

    return NextResponse.json<ApiResponse<{ presets: PromptPreset[] }>>({
      success: true,
      data: { presets },
      message: '프롬프트 프리셋 로드 완료',
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '프롬프트 프리셋 로드 실패' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { presets } = await req.json();
    if (!Array.isArray(presets)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: '프리셋 배열이 필요합니다' },
        { status: 400 }
      );
    }

    const { PromptPresetService } = await import('@/lib/services/promptPresetService');
    const presetService = new PromptPresetService();
    await presetService.savePresets(presets);

    return NextResponse.json<ApiResponse<{ presets: PromptPreset[] }>>({
      success: true,
      data: { presets },
      message: '프롬프트 프리셋 저장 완료',
    });
  } catch (error: any) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || '프롬프트 프리셋 저장 실패' },
      { status: 500 }
    );
  }
}
