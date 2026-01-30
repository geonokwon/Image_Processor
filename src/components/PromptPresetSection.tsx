'use client';

import { PromptPreset } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useState, useCallback, useEffect } from 'react';
import styles from './PromptPresetSection.module.css';

interface PromptPresetSectionProps {
  presets: PromptPreset[];
  selectedPresetId: string | null;
  currentPrompt: string;
  processing: boolean;
  onPresetSelect: (preset: PromptPreset | null) => void; // null이면 선택 해제
  onPresetsChange: (presets: PromptPreset[]) => void;
  onPromptChange: (prompt: string) => void;
}


/**
 * 프롬프트 프리셋 섹션 컴포넌트
 * 
 * 프롬프트 프리셋을 선택하고, 추가/수정/삭제할 수 있습니다.
 */
export default function PromptPresetSection({
  presets,
  selectedPresetId,
  currentPrompt,
  processing,
  onPresetSelect,
  onPresetsChange,
  onPromptChange,
}: PromptPresetSectionProps) {
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetPrompt, setPresetPrompt] = useState('');

  // 모달이 열릴 때 배경 스크롤 방지
  useEffect(() => {
    if (showModal) {
      // 모달이 열릴 때 body 스크롤 방지
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 모달이 닫힐 때 원래대로 복구
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showModal]);

  // 프리셋 저장 (서버에 저장)
  const savePresets = useCallback(async (updatedPresets: PromptPreset[], updatedPrompt?: string) => {
    try {
      const res = await fetch('/api/prompt-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presets: updatedPresets }),
      });
      const result = await res.json();
      if (result.success) {
        onPresetsChange(updatedPresets);
        // 수정된 프리셋이 현재 선택된 프리셋이면 프롬프트도 업데이트
        if (updatedPrompt !== undefined) {
          onPromptChange(updatedPrompt);
        }
      } else {
        alert(`프롬프트 프리셋 저장 실패: ${result.error}`);
      }
    } catch (err: any) {
      console.error('프롬프트 프리셋 저장 실패:', err);
      alert(`프롬프트 프리셋 저장 오류: ${err.message}`);
    }
  }, [onPresetsChange, onPromptChange]);

  // 프리셋 추가/수정 저장
  const handleSave = useCallback(async () => {
    const promptToSave = editingPresetId ? presetPrompt : currentPrompt;
    
    if (!presetName.trim() || !promptToSave.trim()) {
      alert('이름과 프롬프트를 입력해주세요');
      return;
    }

    let updatedPresets: PromptPreset[];
    const trimmedPrompt = promptToSave.trim();

    if (editingPresetId) {
      // 수정 모드
      updatedPresets = presets.map(p =>
        p.id === editingPresetId
          ? { ...p, name: presetName.trim(), prompt: trimmedPrompt }
          : p
      );
      
      await savePresets(updatedPresets);
      
      // 수정 후 프리셋 선택 해제하여 텍스트 입력 가능한 상태로 만들기
      if (editingPresetId === selectedPresetId) {
        onPresetSelect(null);
        onPromptChange('');
      }
    } else {
      // 추가 모드
      const newPreset: PromptPreset = {
        id: uuidv4(),
        name: presetName.trim(),
        prompt: trimmedPrompt,
      };
      updatedPresets = [...presets, newPreset];
      await savePresets(updatedPresets);
    }

    setPresetName('');
    setPresetPrompt('');
    setEditingPresetId(null);
    setShowModal(false);
  }, [presetName, presetPrompt, currentPrompt, editingPresetId, selectedPresetId, presets, savePresets, onPresetSelect, onPromptChange]);

  // 수정 모달 열기
  const handleEdit = useCallback((preset: PromptPreset) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetPrompt(preset.prompt);
    setShowModal(true);
    // 수정 모드로 들어갈 때 프리셋 선택 해제 및 프롬프트 초기화
    if (selectedPresetId === preset.id) {
      onPresetSelect(null);
      onPromptChange('');
    }
  }, [selectedPresetId, onPresetSelect, onPromptChange]);

  // 추가 모달 열기
  const handleAdd = useCallback(() => {
    setEditingPresetId(null);
    setPresetName('');
    setPresetPrompt('');
    setShowModal(true);
  }, []);

  // 프리셋 삭제
  const handleDelete = useCallback((presetId: string) => {
    if (!confirm('이 프롬프트 프리셋을 삭제하시겠습니까?')) return;

    const updatedPresets = presets.filter(p => p.id !== presetId);
    savePresets(updatedPresets);
  }, [presets, savePresets]);

  // 프리셋 선택/해제 (토글)
  const handleSelect = useCallback((preset: PromptPreset) => {
    // 이미 선택된 프리셋을 다시 클릭하면 선택 해제
    if (selectedPresetId === preset.id) {
      onPresetSelect(null);
      onPromptChange(''); // 선택 해제 시 빈 문자열로 설정
    } else {
      onPresetSelect(preset);
    }
  }, [selectedPresetId, onPresetSelect, onPromptChange]);

  return (
    <>
      <div className={styles.presetSection}>
        <div className={styles.presetHeader}>
          <label className={styles.presetLabel}>프롬프트 프리셋:</label>
          <div className={styles.actionButtons}>
            {presets.length > 0 && (
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                disabled={processing}
                className={`${styles.editModeButton} ${editMode ? styles.editModeActive : ''}`}
              >
                {editMode ? '수정 모드' : '수정'}
              </button>
            )}
            <button
              type="button"
              onClick={handleAdd}
              disabled={processing}
              className={styles.addButton}
            >
              + 프리셋 추가
            </button>
          </div>
        </div>
        <div className={styles.presets}>
          {presets.length === 0 ? (
            <p className={styles.noPresets}>프리셋이 없습니다. + 프리셋 추가 버튼을 클릭하여 추가하세요.</p>
          ) : (
            presets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  if (!editMode && !processing) {
                    handleSelect(preset);
                  }
                }}
                className={`${styles.preset} ${
                  selectedPresetId === preset.id ? styles.presetActive : ''
                } ${editMode ? styles.presetEditMode : ''} ${processing ? styles.presetDisabled : ''}`}
                title={preset.name}
              >
                <span className={styles.presetName}>{preset.name}</span>
                {editMode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(preset);
                    }}
                    disabled={processing}
                    className={styles.editButton}
                    title="수정"
                  >
                    수정
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} ${styles.modalContentWide}`}>
            <h3 className={styles.modalTitle}>
              {editingPresetId ? '프롬프트 프리셋 수정' : '프롬프트 프리셋 추가'}
            </h3>
            <div className={styles.modalForm}>
              <label className={styles.modalLabel}>
                프리셋 이름:
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="예: 기본 프롬프트"
                  className={styles.modalInput}
                  autoFocus
                />
              </label>
              <label className={styles.modalLabel}>
                프롬프트 내용:
                <textarea
                  value={editingPresetId ? presetPrompt : currentPrompt}
                  onChange={(e) => {
                    if (editingPresetId) {
                      setPresetPrompt(e.target.value);
                    } else {
                      onPromptChange(e.target.value);
                    }
                  }}
                  placeholder="프롬프트를 입력하세요..."
                  className={styles.modalTextarea}
                  rows={12}
                />
              </label>
              <div className={styles.modalActions}>
                {editingPresetId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('이 프롬프트 프리셋을 삭제하시겠습니까?')) {
                        handleDelete(editingPresetId);
                        setShowModal(false);
                        setEditingPresetId(null);
                        setPresetName('');
                        setPresetPrompt('');
                      }
                    }}
                    className={styles.modalDeleteButton}
                  >
                    삭제
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className={styles.modalConfirmButton}
                >
                  {editingPresetId ? '수정' : '추가'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPresetId(null);
                    setPresetName('');
                    setPresetPrompt('');
                  }}
                  className={styles.modalCancelButton}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
