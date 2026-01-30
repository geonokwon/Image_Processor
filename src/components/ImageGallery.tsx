'use client';

import { UploadedImage, ProcessedImage, ProcessedImageVersion } from '@/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './ImageGallery.module.css';

interface ImageGalleryProps {
  uploadedImages: UploadedImage[];
  processedImages: ProcessedImage[];
  onRetry: (imageId: string, imagePath: string, additionalPrompt?: string) => void;
  onDelete: (imageId: string) => void;
  onDownloadSingle: (image: ProcessedImage) => void;
  onRestoreVersion: (imageId: string, versionIndex: number) => void;
  processing: boolean;
}

export default function ImageGallery({
  uploadedImages,
  processedImages,
  onRetry,
  onDelete,
  onDownloadSingle,
  onRestoreVersion,
  processing,
}: ImageGalleryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadingQueue, setLoadingQueue] = useState<string[]>([]);
  const [retryPrompts, setRetryPrompts] = useState<Record<string, string>>({});
  const [showRetryInput, setShowRetryInput] = useState<Record<string, boolean>>({});
  // 히스토리 네비게이션: 각 이미지별로 현재 선택된 버전 인덱스 (-1은 현재 버전)
  const [historyIndices, setHistoryIndices] = useState<Record<string, number>>({});
  // 이미지 팝업 모달 상태
  const [popupImage, setPopupImage] = useState<{ src: string; filename: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // 클라이언트 사이드에서만 Portal 사용
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  const getProcessedImage = useCallback((originalId: string) => {
    return processedImages.find(p => p.originalImageId === originalId);
  }, [processedImages]);

  // 렌더링 로그 최소화 (개발 모드에서만)
  const imageCount = uploadedImages.length;
  /*
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ ImageGallery 렌더링 - 총 이미지:', imageCount);
    }
  }, [imageCount]);
  */
  
  // 이미지 로딩 상태 초기화 및 순차 로딩 시작
  useEffect(() => {
    // 새로 추가된 이미지만 필터링 (이미 로드되었거나 실패한 이미지는 제외)
    const newImages = uploadedImages.filter(img => 
      !loadedImages.has(img.filename) && !failedImages.has(img.filename)
    );
    
    if (newImages.length > 0) {
      const filenames = newImages.map(img => img.filename);
      setLoadingQueue(prev => [...prev, ...filenames]);
      
      // 큐가 비어있었다면 첫 번째 이미지 로딩 시작
      if (loadingQueue.length === 0) {
        setTimeout(() => {
          const firstImg = document.querySelector(`img[data-filename="${filenames[0]}"]`) as HTMLImageElement;
          if (firstImg && !firstImg.src) {
            firstImg.src = `/api/image/${filenames[0]}`;
          }
        }, 100);
      }
    }
  }, [uploadedImages]); // loadedImages, failedImages는 의존성에서 제외 (무한 루프 방지)
  
  // 순차 로딩 처리 - 이전 이미지가 로드되면 다음 이미지 로드
  useEffect(() => {
    if (loadingQueue.length > 0) {
      const nextImage = loadingQueue[0];
      // 현재 로딩 중인 이미지가 이미 로드되었거나 실패했다면 큐에서 제거하고 다음 이미지 로드
      if (loadedImages.has(nextImage) || failedImages.has(nextImage)) {
        setLoadingQueue(prev => prev.slice(1));
      } else {
        // 아직 로드되지 않았다면 로딩 시도 (이미 시도 중일 수 있음)
        const imgElement = document.querySelector(`img[data-filename="${nextImage}"]`) as HTMLImageElement;
        if (imgElement && !imgElement.src) {
          setTimeout(() => {
            imgElement.src = `/api/image/${nextImage}`;
          }, 200); // 200ms 지연
        }
      }
    }
  }, [loadedImages, failedImages, loadingQueue]);
  
  const handleImageLoad = useCallback((filename: string) => {
    setLoadedImages(prev => {
      if (prev.has(filename)) return prev; // 이미 로드된 경우 상태 변경 안 함
      return new Set([...prev, filename]);
    });
    setFailedImages(prev => {
      if (!prev.has(filename)) return prev; // 실패 목록에 없으면 상태 변경 안 함
      const newSet = new Set(prev);
      newSet.delete(filename);
      return newSet;
    });
  }, []);
  
  const handleImageError = useCallback((filename: string) => {
    setFailedImages(prev => {
      if (prev.has(filename)) return prev; // 이미 실패 목록에 있으면 상태 변경 안 함
      return new Set([...prev, filename]);
    });
  }, []);
  
  const allImagesLoaded = useMemo(() => 
    uploadedImages.every(img => 
      loadedImages.has(img.filename) || failedImages.has(img.filename)
    ), [uploadedImages, loadedImages, failedImages]
  );
  
  if (uploadedImages.length === 0) {
    return null;
  }

  return (
    <div>
      {/* 로딩 상태 표시 */}
      {!allImagesLoaded && (
        <div className={styles.loadingBanner}>
          <div className={styles.spinner}></div>
          <span>이미지 로딩 중... ({loadedImages.size}/{uploadedImages.length})</span>
        </div>
      )}
      
      <div className={styles.gallery}>
        {uploadedImages.map((image, index) => {
          const processed = getProcessedImage(image.id);
          const isLoaded = loadedImages.has(image.filename);
          const isFailed = failedImages.has(image.filename);

          return (
            <div key={image.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h4 className={styles.filename}>{image.originalName}</h4>
                <button 
                  className={styles.deleteButton}
                  onClick={() => onDelete(image.id)}
                  disabled={processing}
                  title="이미지 삭제"
                >
                  ✕
                </button>
              </div>
              <div className={styles.imageRow}>
                {/* 원본 이미지 (왼쪽) */}
                <div className={styles.imageContainer}>
                  <div className={styles.label}>원본</div>
                  <div className={styles.imageWrapper}>
                    {!isLoaded && !isFailed && (
                      <div className={styles.imageLoading}>
                        <div className={styles.imageSpinner}></div>
                        <p>로딩 중...</p>
                      </div>
                    )}
                    <img
                      src=""
                      data-filename={image.filename}
                      alt={image.originalName}
                      className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
                      style={{ display: isLoaded ? 'block' : 'none' }}
                      onLoad={() => {
                        /*
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`✅ 원본 이미지 로드 성공: ${image.filename}`);
                        }
                        */
                        handleImageLoad(image.filename);
                      }}
                      onError={(e) => {
                        /*
                        if (process.env.NODE_ENV === 'development') {
                          console.error(`❌ 원본 이미지 로드 실패: ${image.filename}`);
                        }
                        */
                        handleImageError(image.filename);
                        
                        // 재시도 로직 (한 번만)
                        const imgElement = e.currentTarget;
                        if (imgElement && !imgElement.dataset.retried) {
                          imgElement.dataset.retried = 'true';
                          setTimeout(() => {
                            imgElement.src = `/api/image/${image.filename}?t=${Date.now()}`;
                          }, 1000);
                        }
                      }}
                    />
                    {isFailed && (
                      <div className={styles.imageFailed}>
                        <p>❌ 로드 실패</p>
                        <button 
                          onClick={() => {
                            setFailedImages(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(image.filename);
                              return newSet;
                            });
                            const img = document.querySelector(`img[alt="${image.originalName}"]`) as HTMLImageElement;
                            if (img) {
                              img.src = `/api/image/${image.filename}?retry=${Date.now()}`;
                            }
                          }}
                          className={styles.retryButton}
                        >
                          🔄 재시도
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 처리된 이미지 (오른쪽) */}
                <div className={styles.imageContainer}>
                  <div className={styles.label}>결과</div>
                  <div className={styles.imageWrapper}>
                    {processed?.status === 'completed' && (() => {
                      // 히스토리 인덱스 가져오기 (기본값: -1 = 현재 버전)
                      const historyIndex = historyIndices[image.id] ?? -1;
                      const history = processed.history || [];
                      
                      // 전체 버전 배열 구성 (현재 버전 포함)
                      // history는 [v1, v2, ...] 순서로 저장되어 있고
                      // processed가 현재 버전 (v3)입니다
                      // 따라서 전체 순서는: [v1, v2, v3(현재)] = [history[0], history[1], processed]
                      // 인덱스: v1=0, v2=1, v3(현재)=2 (length)
                      const totalVersions = history.length + 1; // 현재 버전 포함
                      const currentVersionIndex = historyIndex === -1 ? history.length : historyIndex;
                      
                      // 현재 표시할 이미지 정보 결정
                      const displayImage = historyIndex === -1 
                        ? processed // 현재 버전
                        : history[historyIndex]; // 히스토리 버전
                      
                      // 히스토리 네비게이션 가능 여부
                      // 왼쪽(◀): 이전 버전으로 (인덱스 감소: v3 -> v2 -> v1)
                      // 오른쪽(▶): 다음 버전으로 (인덱스 증가: v1 -> v2 -> v3)
                      const canGoLeft = currentVersionIndex > 0; // v1보다 이전은 없음
                      const canGoRight = currentVersionIndex < history.length; // 현재 버전보다 다음은 없음
                      
                      // 이미지 키: 히스토리 인덱스가 바뀔 때마다 이미지가 강제로 리로드되도록
                      const imageKey = `${image.id}-${historyIndex}`;
                      
                      return (
                        <div className={styles.completedContainer}>
                          {/* 히스토리 네비게이션 버튼 */}
                          {history.length > 0 && (
                            <div className={styles.historyNavigation}>
                              <button
                                className={styles.historyNavButton}
                                onClick={() => {
                                  if (canGoLeft) {
                                    // 이전 버전으로 이동 (인덱스 감소)
                                    // 현재가 -1(현재 버전)이면 history.length - 1 (가장 최신 히스토리)로
                                    // 현재가 history.length - 1이면 history.length - 2로
                                    if (historyIndex === -1) {
                                      // 현재 버전에서 가장 최신 히스토리로 (v3 -> v2)
                                      setHistoryIndices(prev => ({ ...prev, [image.id]: history.length - 1 }));
                                    } else if (historyIndex > 0) {
                                      // 히스토리에서 한 단계 이전으로 (v2 -> v1)
                                      setHistoryIndices(prev => ({ ...prev, [image.id]: historyIndex - 1 }));
                                    }
                                  }
                                }}
                                disabled={!canGoLeft || processing}
                                title="이전 버전 보기"
                              >
                                ◀
                              </button>
                              <button
                                className={styles.historyNavButton}
                                onClick={() => {
                                  if (canGoRight) {
                                    // 다음 버전으로 이동 (인덱스 증가)
                                    if (historyIndex === history.length - 1) {
                                      // 가장 최신 히스토리에서 현재 버전으로 (v2 -> v3)
                                      setHistoryIndices(prev => ({ ...prev, [image.id]: -1 }));
                                    } else if (historyIndex >= 0) {
                                      // 히스토리에서 한 단계 다음으로 (v1 -> v2)
                                      setHistoryIndices(prev => ({ ...prev, [image.id]: historyIndex + 1 }));
                                    }
                                  }
                                }}
                                disabled={!canGoRight || processing}
                                title={historyIndex === history.length - 1 ? "현재 버전으로" : "다음 버전 보기"}
                              >
                                ▶
                              </button>
                            </div>
                          )}
                          
                          <img
                            key={imageKey}
                            src={`/api/image/${displayImage?.filename || processed.filename}?t=${Date.now()}`}
                            alt="Processed"
                            className={styles.image}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setPopupImage({
                                src: `/api/image/${displayImage?.filename || processed.filename}`,
                                filename: displayImage?.filename || processed.filename
                              });
                            }}
                            onError={(e) => {
                              console.error(
                                `❌ 처리된 이미지 로드 실패: ${displayImage?.filename || processed.filename}`,
                                `시도한 URL: ${e.currentTarget.src}`,
                                `원본 이미지 ID: ${image.id}`,
                                `히스토리 인덱스: ${historyIndex}`
                              );
                            }}
                          />
                          
                          {!showRetryInput[image.id] ? (
                            <div className={styles.completedActions}>
                              {/* 현재 선택된 버전으로 되돌리기 버튼 (히스토리 버전일 때만 표시) */}
                              {historyIndex !== -1 && displayImage && (
                                <button
                                  className={styles.restoreButton}
                                  onClick={() => {
                                    onRestoreVersion(image.id, historyIndex);
                                    setHistoryIndices(prev => ({ ...prev, [image.id]: -1 }));
                                  }}
                                  disabled={processing}
                                  title="이 버전으로 되돌리기"
                                >
                                  ↩️
                                </button>
                              )}
                              {/* 개별 다운로드 버튼 */}
                              <button
                                className={styles.downloadSingleButton}
                                onClick={() => {
                                  // 현재 선택된 버전으로 다운로드 (임시로 ProcessedImage 형태로 변환)
                                  const downloadImage: ProcessedImage = historyIndex === -1
                                    ? processed
                                    : {
                                        ...processed,
                                        filename: displayImage.filename,
                                        path: displayImage.path,
                                        prompt: displayImage.prompt,
                                        processedAt: displayImage.processedAt,
                                        tokens: displayImage.tokens,
                                      };
                                  onDownloadSingle(downloadImage);
                                }}
                                disabled={processing}
                                title="이 이미지 다운로드"
                              >
                                📥
                              </button>
                              <button
                                className={styles.retrySmallButton}
                                onClick={() => onRetry(image.id, image.path)}
                                disabled={processing}
                                title="다시 처리"
                              >
                                🔄
                              </button>
                              <button
                                className={styles.retryWithPromptSmallButton}
                                onClick={() => setShowRetryInput(prev => ({ ...prev, [image.id]: true }))}
                                disabled={processing}
                                title="추가 요청으로 재처리"
                              >
                                ✏️
                              </button>
                            </div>
                          ) : (
                            <div className={styles.retryInputOverlay}>
                              <textarea
                                className={styles.retryInput}
                                placeholder="추가 요청사항을 입력하세요"
                                value={retryPrompts[image.id] || ''}
                                onChange={(e) => setRetryPrompts(prev => ({ ...prev, [image.id]: e.target.value }))}
                                rows={2}
                              />
                              <div className={styles.retryInputButtons}>
                                <button
                                  className={styles.retryConfirmButton}
                                  onClick={() => {
                                    onRetry(image.id, image.path, retryPrompts[image.id]);
                                    setShowRetryInput(prev => ({ ...prev, [image.id]: false }));
                                    setRetryPrompts(prev => ({ ...prev, [image.id]: '' }));
                                    // 재처리 후 현재 버전으로 리셋
                                    setHistoryIndices(prev => ({ ...prev, [image.id]: -1 }));
                                  }}
                                  disabled={processing}
                                >
                                  🚀
                                </button>
                                <button
                                  className={styles.retryCancelButton}
                                  onClick={() => {
                                    setShowRetryInput(prev => ({ ...prev, [image.id]: false }));
                                    setRetryPrompts(prev => ({ ...prev, [image.id]: '' }));
                                  }}
                                  disabled={processing}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {processed?.status === 'processing' && (
                      <div className={styles.processing}>
                        <div className={styles.spinner}></div>
                        <p>처리 중...</p>
                      </div>
                    )}
                    {processed?.status === 'failed' && (
                      <div className={styles.error}>
                        <p>❌ 실패</p>
                        <p className={styles.errorMsg}>{processed.error}</p>
                        
                        {!showRetryInput[image.id] ? (
                          <div className={styles.retryButtons}>
                            <button
                              className={styles.retryButton}
                              onClick={() => onRetry(image.id, image.path)}
                              disabled={processing}
                            >
                              🔄 재처리
                            </button>
                            <button
                              className={styles.retryWithPromptButton}
                              onClick={() => setShowRetryInput(prev => ({ ...prev, [image.id]: true }))}
                              disabled={processing}
                            >
                              ✏️ 추가 요청
                            </button>
                          </div>
                        ) : (
                          <div className={styles.retryInputContainer}>
                            <textarea
                              className={styles.retryInput}
                              placeholder="추가 요청사항을 입력하세요 (예: 배경을 더 밝게, 음식을 더 선명하게)"
                              value={retryPrompts[image.id] || ''}
                              onChange={(e) => setRetryPrompts(prev => ({ ...prev, [image.id]: e.target.value }))}
                              rows={2}
                            />
                            <div className={styles.retryInputButtons}>
                              <button
                                className={styles.retryConfirmButton}
                                onClick={() => {
                                  onRetry(image.id, image.path, retryPrompts[image.id]);
                                  setShowRetryInput(prev => ({ ...prev, [image.id]: false }));
                                  setRetryPrompts(prev => ({ ...prev, [image.id]: '' }));
                                }}
                                disabled={processing}
                              >
                                🚀 재처리
                              </button>
                              <button
                                className={styles.retryCancelButton}
                                onClick={() => {
                                  setShowRetryInput(prev => ({ ...prev, [image.id]: false }));
                                  setRetryPrompts(prev => ({ ...prev, [image.id]: '' }));
                                }}
                                disabled={processing}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {!processed && processing && (
                      <div className={styles.pending}>
                        <p>⏳ 대기 중...</p>
                      </div>
                    )}
                    {!processed && !processing && (
                      <div className={styles.notProcessed}>
                        <p>미처리</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 이미지 팝업 모달 - Portal로 body에 렌더링 */}
      {mounted && popupImage && createPortal(
        <div 
          className={styles.imagePopupOverlay}
          onClick={() => setPopupImage(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setPopupImage(null);
            }
          }}
          tabIndex={-1}
        >
          <div 
            className={styles.imagePopupContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.imagePopupClose}
              onClick={() => setPopupImage(null)}
              title="닫기 (ESC)"
              aria-label="팝업 닫기"
            >
              ✕
            </button>
            <img
              src={popupImage.src}
              alt={popupImage.filename}
              className={styles.imagePopupImg}
            />
            <div className={styles.imagePopupFilename}>{popupImage.filename}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}