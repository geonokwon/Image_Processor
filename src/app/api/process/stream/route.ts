import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJobStore } from '@/lib/jobStore';

/**
 * Server-Sent Events (SSE)를 사용한 작업 상태 스트리밍
 * 폴링 대신 서버에서 클라이언트로 실시간 업데이트를 보냅니다
 */
export async function GET(req: NextRequest) {
  // 인증 확인
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('jobId가 필요합니다', { status: 400 });
  }

  // SSE 스트림 생성
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const jobs = getJobStore();
      let isClosed = false; // 스트림이 닫혔는지 추적
      let interval: NodeJS.Timeout | null = null;
      let timeout: NodeJS.Timeout | null = null;
      
      // 안전하게 스트림 닫기
      const safeClose = () => {
        if (!isClosed) {
          try {
            controller.close();
            isClosed = true;
          } catch (error) {
            // 이미 닫혔으면 무시
            isClosed = true;
          }
        }
        // 모든 타이머 정리
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };
      
      // 초기 연결 메시지
      try {
        controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));
      } catch (error) {
        // 연결이 이미 끊어진 경우
        return;
      }

      // 주기적으로 작업 상태 확인 (1초마다)
      interval = setInterval(() => {
        if (isClosed) {
          safeClose();
          return;
        }

        try {
          const job = jobs.get(jobId);
          
          if (!job) {
            controller.enqueue(encoder.encode('data: {"type":"error","message":"작업을 찾을 수 없습니다"}\n\n'));
            safeClose();
            return;
          }

          // 작업 상태 전송
          const data = JSON.stringify({
            type: 'update',
            job: {
              id: job.id,
              status: job.status,
              results: job.results,
              processedCount: job.processedCount,
              failedCount: job.failedCount,
              totalImages: job.totalImages,
            },
          });

          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // 작업 완료 시 스트림 종료
          if (job.status === 'completed' || job.status === 'partial' || job.status === 'failed') {
            safeClose();
          }
        } catch (error) {
          // 에러 발생 시 스트림 닫기
          safeClose();
        }
      }, 1000); // 1초마다 확인

      // 클라이언트 연결 종료 시 정리
      req.signal.addEventListener('abort', () => {
        safeClose();
      });

      // 최대 10분 후 자동 종료
      timeout = setTimeout(() => {
        safeClose();
      }, 10 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}


