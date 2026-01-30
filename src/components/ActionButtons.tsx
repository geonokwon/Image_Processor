'use client';

import { ProcessedImage } from '@/types';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  hasUploadedImages: boolean;
  completedCount: number;
  processing: boolean;
  uploading: boolean;
  downloading: boolean;
  onProcessAll: () => void;
  onReset: () => void;
  onDownloadAll: () => void;
}

/**
 * 액션 버튼 컴포넌트
 * 
 * 모든 이미지 처리하기, 초기화, 모두 다운로드 버튼을 제공합니다.
 */
export default function ActionButtons({
  hasUploadedImages,
  completedCount,
  processing,
  uploading,
  downloading,
  onProcessAll,
  onReset,
  onDownloadAll,
}: ActionButtonsProps) {
  // 업로드된 이미지가 없으면 표시하지 않음
  if (!hasUploadedImages) {
    return null;
  }

  return (
    <div className={styles.actionButtonsWrapper}>
      <div className={styles.processResetWrapper}>
        <button
          onClick={onProcessAll}
          disabled={processing || uploading}
          className={styles.processButton}
        >
          {processing ? '처리 중...' : '모든 이미지 처리하기'}
        </button>
        <button
          onClick={onReset}
          disabled={processing || uploading}
          className={styles.resetButton}
        >
          초기화
        </button>
      </div>
      {completedCount > 0 && (
        <button
          onClick={onDownloadAll}
          className={styles.downloadButton}
          disabled={processing || downloading}
        >
          {downloading ? 'ZIP 생성 중...' : '모두 다운로드 (ZIP)'}
        </button>
      )}
    </div>
  );
}
