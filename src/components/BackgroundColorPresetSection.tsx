'use client';

import { BackgroundColorPreset } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useState, useCallback } from 'react';
import styles from './BackgroundColorPresetSection.module.css';

interface BackgroundColorPresetSectionProps {
  presets: BackgroundColorPreset[];
  selectedPresetId: string | null;
  processing: boolean;
  onPresetSelect: (presetId: string) => void;
  onPresetsChange: (presets: BackgroundColorPreset[]) => void;
}

/**
 * 배경색 프리셋 섹션 컴포넌트
 * 
 * 배경색 프리셋을 선택하고, 추가/수정/삭제할 수 있습니다.
 */
export default function BackgroundColorPresetSection({
  presets,
  selectedPresetId,
  processing,
  onPresetSelect,
  onPresetsChange,
}: BackgroundColorPresetSectionProps) {
  const [editMode, setEditMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetColor, setPresetColor] = useState('#ffffff');

  // 프리셋 저장 (서버에 저장)
  const savePresets = useCallback(async (updatedPresets: BackgroundColorPreset[]) => {
    try {
      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presets: updatedPresets }),
      });
      const result = await res.json();
      if (result.success) {
        onPresetsChange(updatedPresets);
      } else {
        alert(`프리셋 저장 실패: ${result.error}`);
      }
    } catch (err: any) {
      console.error('프리셋 저장 실패:', err);
      alert(`프리셋 저장 오류: ${err.message}`);
    }
  }, [onPresetsChange]);

  // 프리셋 추가/수정 저장
  const handleSave = useCallback(() => {
    if (!presetName.trim() || !presetColor.trim()) {
      alert('이름과 색상을 입력해주세요');
      return;
    }

    let updatedPresets: BackgroundColorPreset[];

    if (editingPresetId) {
      // 수정 모드
      updatedPresets = presets.map(p =>
        p.id === editingPresetId
          ? { ...p, name: presetName.trim(), colorCode: presetColor.trim() }
          : p
      );
    } else {
      // 추가 모드
      const newPreset: BackgroundColorPreset = {
        id: uuidv4(),
        name: presetName.trim(),
        colorCode: presetColor.trim(),
      };
      updatedPresets = [...presets, newPreset];
    }

    savePresets(updatedPresets);
    setPresetName('');
    setPresetColor('#ffffff');
    setEditingPresetId(null);
    setShowModal(false);
  }, [presetName, presetColor, editingPresetId, presets, savePresets]);

  // 수정 모달 열기
  const handleEdit = useCallback((preset: BackgroundColorPreset) => {
    setEditingPresetId(preset.id);
    setPresetName(preset.name);
    setPresetColor(preset.colorCode);
    setShowModal(true);
  }, []);

  // 추가 모달 열기
  const handleAdd = useCallback(() => {
    setEditingPresetId(null);
    setPresetName('');
    setPresetColor('#ffffff');
    setShowModal(true);
  }, []);

  // 프리셋 삭제
  const handleDelete = useCallback((presetId: string) => {
    if (!confirm('이 프리셋을 삭제하시겠습니까?')) return;

    const updatedPresets = presets.filter(p => p.id !== presetId);
    savePresets(updatedPresets);
    
    // 삭제한 프리셋이 선택되어 있었다면 선택 해제
    if (selectedPresetId === presetId) {
      onPresetSelect('');
    }
  }, [presets, selectedPresetId, onPresetSelect, savePresets]);

  // 프리셋 선택
  const handleSelect = useCallback((presetId: string) => {
    onPresetSelect(presetId);
  }, [onPresetSelect]);

  return (
    <>
      <div className={styles.presetSection}>
        <div className={styles.presetHeader}>
          <label className={styles.presetLabel}>배경색 프리셋:</label>
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
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (!editMode) {
                    handleSelect(preset.id);
                  }
                }}
                disabled={processing}
                className={`${styles.preset} ${
                  selectedPresetId === preset.id ? styles.presetActive : ''
                } ${editMode ? styles.presetEditMode : ''}`}
                title={preset.name}
              >
                <span
                  className={styles.colorSwatch}
                  style={{ backgroundColor: preset.colorCode }}
                />
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
              </button>
            ))
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>
              {editingPresetId ? '배경색 프리셋 수정' : '배경색 프리셋 추가'}
            </h3>
            <div className={styles.modalForm}>
              <label className={styles.modalLabel}>
                프리셋 이름:
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="예: 흰색 배경"
                  className={styles.modalInput}
                  autoFocus
                />
              </label>
              <label className={styles.modalLabel}>
                색상 코드:
                <div className={styles.colorInputWrapper}>
                  <input
                    type="color"
                    value={presetColor}
                    onChange={(e) => setPresetColor(e.target.value)}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={presetColor}
                    onChange={(e) => setPresetColor(e.target.value)}
                    placeholder="#ffffff"
                    className={styles.colorCodeInput}
                  />
                </div>
              </label>
              <div className={styles.modalActions}>
                {editingPresetId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('이 프리셋을 삭제하시겠습니까?')) {
                        handleDelete(editingPresetId);
                        setShowModal(false);
                        setEditingPresetId(null);
                        setPresetName('');
                        setPresetColor('#ffffff');
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
                    setPresetColor('#ffffff');
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
