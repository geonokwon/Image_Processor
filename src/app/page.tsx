'use client';

import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageGallery from '@/components/ImageGallery';
import StatusSection from '@/components/StatusSection';
import PromptPresetSection from '@/components/PromptPresetSection';
import BackgroundColorPresetSection from '@/components/BackgroundColorPresetSection';
import ActionButtons from '@/components/ActionButtons';
import PromptInputSection from '@/components/PromptInputSection';
import { UploadedImage, ProcessedImage, ProcessingJob, BackgroundColorPreset, PromptPreset } from '@/types';
import styles from './page.module.css';

export default function Home() {
  const { data: session } = useSession();
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [jobId, setJobId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false); // 전체 다운로드 중 상태
  const [highQuality, setHighQuality] = useState(false); // false = 1K, true = 2K
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState<string | null>(null); // 선택된 배경색 프리셋 ID
  const [backgroundColorPresets, setBackgroundColorPresets] = useState<BackgroundColorPreset[]>([]); // 사용자 정의 프리셋 목록
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]); // 프롬프트 프리셋 목록
  const [selectedPromptPresetId, setSelectedPromptPresetId] = useState<string | null>(null); // 선택된 프롬프트 프리셋 ID
  const eventSourceRef = useRef<EventSource | null>(null); // SSE 연결 참조

  // 서버에서 프롬프트 프리셋 불러오기
  useEffect(() => {
    if (!session) return;

    const loadPromptPresets = async () => {
      try {
        const res = await fetch('/api/prompt-presets');
        const result = await res.json();
        if (result.success && result.data?.presets) {
          setPromptPresets(result.data.presets);
        }
      } catch (err) {
        console.error('프롬프트 프리셋 불러오기 실패:', err);
      }
    };

    loadPromptPresets();
  }, [session]);

  // 서버에서 프리셋 불러오기
  useEffect(() => {
    if (!session) return;

    const loadPresets = async () => {
      try {
        const res = await fetch('/api/presets');
        const result = await res.json();
        if (result.success && result.data?.presets) {
          setBackgroundColorPresets(result.data.presets);
        }
      } catch (err) {
        console.error('프리셋 불러오기 실패:', err);
      }
    };

    loadPresets();
  }, [session]);

  // 프롬프트 프리셋 선택/해제
  const handleSelectPromptPreset = useCallback((preset: PromptPreset | null) => {
    if (preset) {
      // 프리셋 선택
      setPrompt(preset.prompt);
      setSelectedPromptPresetId(preset.id);
    } else {
      // 프리셋 선택 해제
      setPrompt('');
      setSelectedPromptPresetId(null);
    }
  }, []);

  // 이미지 업로드
  const handleUpload = useCallback(async (files: File[]) => {
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadedImages(prev => {
          const newImages = [...prev, ...result.data.images];
          return newImages;
        });
      } else {
        alert(`업로드 실패: ${result.error}`);
      }
    } catch (error: any) {
      alert(`업로드 오류: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = () => {
    setUploadedImages([]);
    setProcessedImages([]);
    setJobId('');
    setProcessing(false);
  }

  // Server-Sent Events를 사용한 작업 상태 스트리밍 (폴링 대신)
  const startJobStatusStream = useCallback((jobId: string) => {
    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // SSE 연결 생성
    const eventSource = new EventSource(`/api/process/stream?jobId=${jobId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'update' && data.job) {
          const job: ProcessingJob = data.job;
          setProcessedImages(job.results);

          // 작업 완료 시 연결 종료
          if (job.status === 'completed' || job.status === 'partial' || job.status === 'failed') {
            eventSource.close();
            eventSourceRef.current = null;
            setProcessing(false);
          }
        } else if (data.type === 'error') {
          console.error('SSE 오류:', data.message);
          eventSource.close();
          eventSourceRef.current = null;
          setProcessing(false);
        }
      } catch (error) {
        console.error('SSE 데이터 파싱 오류:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 연결 오류:', error);
      eventSource.close();
      eventSourceRef.current = null;
      setProcessing(false);
    };
  }, []);

  // 컴포넌트 언마운트 시 SSE 연결 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // 일괄 처리 시작
  const handleProcessAll = useCallback(async () => {
    if (uploadedImages.length === 0) {
      alert('업로드된 이미지가 없습니다');
      return;
    }

    if (!prompt.trim()) {
      alert('프롬프트를 입력해주세요');
      return;
    }

    if (!selectedBackgroundColor) {
      alert('배경색 프리셋을 선택해주세요');
      return;
    }

    setProcessing(true);
    setProcessedImages([]);

    try {
      // 배경색 프리셋 적용 - 프롬프트 마지막에 추가
      let finalPrompt = prompt;
      if (selectedBackgroundColor) {
        const selectedPreset = backgroundColorPresets.find(p => p.id === selectedBackgroundColor);
        if (selectedPreset) {
          finalPrompt = `${prompt}\n\n배경색은: ${selectedPreset.colorCode}`;
        }
      }

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: uploadedImages, 
          prompt: finalPrompt,
          imageSize: highQuality ? '2K' : '1K'
        }),
      });

      const result = await response.json();

      if (result.success) {
        setJobId(result.data.jobId);
        // 작업 상태 폴링 시작
        startJobStatusStream(result.data.jobId);
      } else {
        alert(`처리 시작 실패: ${result.error}`);
        setProcessing(false);
      }
    } catch (error: any) {
      alert(`처리 오류: ${error.message}`);
      setProcessing(false);
    }
  }, [uploadedImages, prompt, selectedBackgroundColor, backgroundColorPresets, highQuality, startJobStatusStream]);

  // 개별 재처리
  const handleRetry = useCallback(async (imageId: string, imagePath: string, additionalPrompt?: string) => {
    try {
      // 현재 처리된 이미지 찾기
      const currentProcessedImage = processedImages.find(img => img.originalImageId === imageId);

      // UI 즉시 업데이트: 로딩 상태로 변경 (스피너 표시)
      setProcessedImages(prev =>
        prev.map(img =>
          img.originalImageId === imageId 
            ? { ...img, status: 'processing' } 
            : img
        )
      );

      // 배경색 프리셋 적용 - 프롬프트 마지막에 추가
      let basePrompt = prompt;
      if (selectedBackgroundColor) {
        const selectedPreset = backgroundColorPresets.find(p => p.id === selectedBackgroundColor);
        if (selectedPreset) {
          basePrompt = `${prompt}\n\n배경색은: ${selectedPreset.colorCode}`;
        }
      }

      // 기본 프롬프트와 추가 프롬프트 합치기
      const finalPrompt = additionalPrompt 
        ? `${basePrompt}\n\n(Additional User Request: ${additionalPrompt})`
        : basePrompt;

      const response = await fetch(`/api/process/${imageId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageId, 
          imagePath, 
          prompt: finalPrompt, // 합쳐진 프롬프트 전달
          currentProcessedImage // 현재 버전을 히스토리에 저장하기 위해 전달
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 재처리된 이미지로 업데이트 (히스토리 포함)
        setProcessedImages(prev =>
          prev.map(img =>
            img.originalImageId === imageId ? result.data : img
          )
        );
      } else {
        alert(`재처리 실패: ${result.error}`);
        // 실패 시 상태 원복 또는 failed 상태로 변경
        setProcessedImages(prev =>
          prev.map(img =>
            img.originalImageId === imageId 
              ? { ...img, status: 'failed', error: result.error } 
              : img
          )
        );
      }
    } catch (error: any) {
      alert(`재처리 오류: ${error.message}`);
      setProcessedImages(prev =>
        prev.map(img =>
          img.originalImageId === imageId 
            ? { ...img, status: 'failed', error: error.message } 
            : img
        )
      );
    }
  }, [prompt, selectedBackgroundColor, backgroundColorPresets, processedImages]);

  // ZIP 다운로드 + 이미지 삭제
  const handleDownloadAll = useCallback(async () => {
    // 이미 다운로드 중이면 무시
    if (downloading) {
      return;
    }

    const completedImages = processedImages.filter(img => img.status === 'completed');

    if (completedImages.length === 0) {
      alert('다운로드할 이미지가 없습니다');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          images: completedImages,
          uploadedImages: uploadedImages, // 원본 이미지 정보도 전달
        }),
      });

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 다운로드 완료 후 모든 이미지 초기화
      alert('다운로드 완료! 업로드된 이미지를 삭제합니다.');
      setUploadedImages([]);
      setProcessedImages([]);
      setJobId('');
    } catch (error: any) {
      alert(`다운로드 오류: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  }, [processedImages, uploadedImages, downloading]);

  // 개별 이미지 다운로드
  const handleDownloadSingle = useCallback(async (image: ProcessedImage) => {
    if (image.status !== 'completed') {
      alert('완료된 이미지만 다운로드할 수 있습니다');
      return;
    }

    try {
      const response = await fetch('/api/download/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`다운로드 오류: ${error.message}`);
    }
  }, []);

  // 히스토리 버전으로 되돌리기
  const handleRestoreVersion = useCallback((imageId: string, versionIndex: number) => {
    setProcessedImages(prev =>
      prev.map(img => {
        if (img.originalImageId === imageId && img.history && img.history.length > versionIndex) {
          const version = img.history[versionIndex];
          // 히스토리에서 제거하고 현재 버전으로 설정
          const newHistory = [...img.history];
          newHistory.splice(versionIndex, 1);
          return {
            ...version,
            id: img.id,
            originalImageId: img.originalImageId,
            status: 'completed' as const,
            history: [...newHistory, {
              id: img.id,
              filename: img.filename,
              path: img.path,
              prompt: img.prompt,
              processedAt: img.processedAt || new Date().toISOString(),
              tokens: img.tokens,
            }],
          };
        }
        return img;
      })
    );
  }, []);

  // 새로고침/페이지 이탈 시 서버에 업로드/결과 이미지 정리 요청
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (uploadedImages.length === 0 && processedImages.length === 0) return;
      try {
        const payload = JSON.stringify({ uploadedImages, processedImages });
        navigator.sendBeacon('/api/image/cleanup', payload);
      } catch {
        // sendBeacon 실패 시 조용히 무시
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadedImages, processedImages]);

  // 개별 이미지 삭제
  const handleDelete = useCallback(
    async (imageId: string) => {
      const target = uploadedImages.find((img) => img.id === imageId);
      if (!target) {
        alert('삭제할 이미지를 찾을 수 없습니다.');
        return;
      }

      if (
        !confirm(
          `'${target.originalName}' 이미지를 삭제하시겠습니까?\n(원본 파일과 처리된 결과가 모두 삭제됩니다)`
        )
      ) {
        return;
      }

      try {
        const res = await fetch('/api/image/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId, filename: target.filename }),
        });

        const result = await res.json();
        if (!result.success) {
          alert(`이미지 삭제 실패: ${result.error}`);
          return;
        }

        // 클라이언트 상태에서도 제거
        setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
        setProcessedImages((prev) =>
          prev.filter((img) => img.originalImageId !== imageId)
        );
      } catch (err: any) {
        alert(`이미지 삭제 오류: ${err.message}`);
      }
    },
    [uploadedImages]
  );

  // 초기화
  const handleReset = useCallback(async () => {
    if (confirm('모든 이미지를 초기화하시겠습니까? (원본 및 처리된 이미지가 모두 삭제됩니다)')) {
      try {
        // 서버의 이미지 파일들 삭제 (새로고침과 동일한 로직)
        if (uploadedImages.length > 0 || processedImages.length > 0) {
          await fetch('/api/image/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadedImages, processedImages }),
          });
        }
        
        // 클라이언트 상태 초기화
        setUploadedImages([]);
        setProcessedImages([]);
        setJobId('');
        setProcessing(false);
      } catch (error: any) {
        console.error('초기화 중 오류:', error);
        // 오류가 발생해도 클라이언트 상태는 초기화
        setUploadedImages([]);
        setProcessedImages([]);
        setJobId('');
        setProcessing(false);
      }
    }
  }, [uploadedImages, processedImages]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>하이오더 메뉴 이미지 만들기</h1>
          <div className={styles.headerActions}>
            <span className={styles.username}> {session?.user?.name || 'User'}</span>
            <button onClick={() => signOut()} className={styles.logoutButton}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* 업로드 영역과 프롬프트 입력 영역 (좌우 배치) */}
        <div className={styles.topSectionWrapper}>
          {/* 왼쪽 열: 업로드 영역 */}
          <div className={styles.leftColumn}>
            {/* 업로드 영역 */}
            <section className={`${styles.section} ${styles.uploadSection}`}>
              <h2 className={styles.sectionTitle}>이미지 업로드</h2>
              <ImageUploader onUpload={handleUpload} disabled={uploading || processing} />
            </section>

            {/* 상태 표시 */}
            <StatusSection 
              uploadedCount={uploadedImages.length}
              processedImages={processedImages}
            />
          </div>

          {/* 오른쪽 열: 프롬프트 입력 */}
          <section className={`${styles.section} ${styles.promptSection}`}>
          <h2 className={styles.sectionTitle}>AI 프롬프트</h2>

          {/* 프롬프트 프리셋 선택 */}
          <PromptPresetSection
            presets={promptPresets}
            selectedPresetId={selectedPromptPresetId}
            currentPrompt={prompt}
            processing={processing}
            onPresetSelect={(preset) => {
              handleSelectPromptPreset(preset);
            }}
            onPresetsChange={(updatedPresets) => {
              setPromptPresets(updatedPresets);
            }}
            onPromptChange={(newPrompt) => {
              setPrompt(newPrompt);
              // 프롬프트를 직접 수정하면 선택된 프리셋 해제
              if (selectedPromptPresetId) {
                setSelectedPromptPresetId(null);
              }
            }}
          />

          {/* 프롬프트 입력 */}
          <PromptInputSection
            prompt={prompt}
            processing={processing}
            isReadOnly={selectedPromptPresetId !== null}
            onPromptChange={(newPrompt) => {
              // 프롬프트를 직접 수정하려고 하면 프리셋 해제
              if (selectedPromptPresetId) {
                setSelectedPromptPresetId(null);
              }
              setPrompt(newPrompt);
            }}
          />

          {/* 배경색 프리셋 선택 */}
          <BackgroundColorPresetSection
            presets={backgroundColorPresets}
            selectedPresetId={selectedBackgroundColor || ''}
            processing={processing}
            onPresetSelect={(presetId) => {
              setSelectedBackgroundColor(presetId || null);
            }}
            onPresetsChange={(updatedPresets) => {
              setBackgroundColorPresets(updatedPresets);
            }}
          />
          
          {/* 이미지 해상도 토글 */}
          <div className={styles.qualityToggle}>
            <label className={styles.toggleLabel}>
              <span className={styles.toggleText}>이미지 해상도:</span>
              <span className={styles.toggleValue}>{highQuality ? '2K (고화질)' : '1K (기본)'}</span>
            </label>
            <button
              type="button"
              onClick={() => setHighQuality(!highQuality)}
              disabled={processing}
              className={`${styles.toggleButton} ${highQuality ? styles.toggleActive : ''}`}
            >
              <span className={styles.toggleSlider}></span>
            </button>
          </div>

          {/* 액션 버튼들 */}
          <ActionButtons
            hasUploadedImages={uploadedImages.length > 0}
            completedCount={processedImages.filter(img => img.status === 'completed').length}
            processing={processing}
            uploading={uploading}
            downloading={downloading}
            onProcessAll={handleProcessAll}
            onReset={handleReset}
            onDownloadAll={handleDownloadAll}
          />
          </section>
        </div>


        {/* 이미지 갤러리 */}
        <ImageGallery
          uploadedImages={uploadedImages}
          processedImages={processedImages}
          onRetry={handleRetry}
          onDelete={handleDelete}
          onDownloadSingle={handleDownloadSingle}
          onRestoreVersion={handleRestoreVersion}
          processing={processing}
        />
      </main>
    </div>
  );
}
