'use client';

import styles from './PromptInputSection.module.css';

interface PromptInputSectionProps {
  prompt: string;
  processing: boolean;
  isReadOnly?: boolean; // 프리셋 선택 시 읽기 전용
  onPromptChange: (prompt: string) => void;
}


/**
 * 프롬프트 입력 섹션 컴포넌트
 * 
 * 프롬프트 텍스트를 입력할 수 있는 textarea를 제공합니다.
 * 프리셋이 선택되면 읽기 전용으로 표시됩니다.
 */
export default function PromptInputSection({
  prompt,
  processing,
  isReadOnly = false,
  onPromptChange,
}: PromptInputSectionProps) {
  return (
    <textarea
      className={styles.promptInput}
      value={prompt}
      onChange={(e) => {
        if (!isReadOnly) {
          onPromptChange(e.target.value);
        }
      }}
      onKeyDown={(e) => {
        // 읽기 전용일 때 입력 방지
        if (isReadOnly) {
          e.preventDefault();
        }
      }}
      placeholder="모든 이미지에 적용할 프롬프트를 입력하세요..."
      rows={3}
      disabled={processing}
      readOnly={isReadOnly}
    />
  );
}
