'use client';

import { ProcessedImage } from '@/types';
import styles from './StatusSection.module.css';
import { StringList } from '@google/genai';

interface StatusSectionProps {
  uploadedCount: number;
  processedImages: ProcessedImage[];
}

/**
 * 상태 표시 섹션 컴포넌트
 * 
 * 업로드된 이미지 수, 처리 완료/실패 수, 토큰 사용량을 표시합니다.
 */
export default function StatusSection({ uploadedCount, processedImages }: StatusSectionProps) {
  // 업로드된 이미지가 없으면 아무것도 표시하지 않음
  if (uploadedCount === 0) {
    return null;
  }

  // 처리 완료된 이미지 수 계산
  const completedCount = processedImages.filter(img => img.status === 'completed').length;
  
  // 처리 실패한 이미지 수 계산
  const failedCount = processedImages.filter(img => img.status === 'failed').length;

  // 총 토큰 사용량 계산
  let totalTokens = 0;
  processedImages.forEach(img => {
    // 현재 버전의 토큰 추가 (완료된 경우만)
    if (img.status === 'completed' && img.tokens?.totalTokens) {
      totalTokens += img.tokens.totalTokens;
    }
    // 히스토리에 있는 모든 버전의 토큰 추가
    if (img.history && img.history.length > 0) {
      img.history.forEach(version => {
        if (version.tokens?.totalTokens) {
          totalTokens += version.tokens.totalTokens;
        }
      });
    }
  });

  return (
    <section className={`${styles.section} ${styles.statusSection}`}>
      <div className={styles.status}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>업로드된 이미지:</span>
          <span className={styles.statusValue}>{uploadedCount}개</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>처리 완료:</span>
          <span className={styles.statusValue}>{completedCount}개</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>처리 실패:</span>
          <span className={styles.statusValue}>{failedCount}개</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>토큰 사용량:</span>
          <span className={styles.statusValue}>{totalTokens.toLocaleString()} t</span>
        </div>
      </div>
    </section>
  );
}
