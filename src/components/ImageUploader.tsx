'use client';

import { useState, useCallback } from 'react';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onUpload, disabled }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      onUpload(files);
    }
  }, [disabled, onUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      onUpload(files);
    }
  }, [disabled, onUpload]);

  return (
    <div
      className={`${styles.uploader} ${dragActive ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="fileInput"
        className={styles.input}
        multiple
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
      />
      <label htmlFor="fileInput" className={styles.label}>
        <div className={styles.icon}>📁</div>
        <p className={styles.text}>
          {dragActive
            ? '이미지를 여기에 놓으세요'
            : '드래그 앤 드롭 또는 클릭하여 이미지 선택'}
        </p>
        <p className={styles.hint}>JPG, PNG, WEBP 지원 (최대 50개)</p>
      </label>
    </div>
  );
}

