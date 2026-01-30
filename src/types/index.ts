// NextAuth 관련 타입
export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

// 이미지 처리 관련 타입
export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ProcessedImageVersion {
  id: string;
  filename: string;
  path: string;
  prompt: string;
  processedAt?: string;
  tokens?: {
    promptTokens?: number;
    totalTokens?: number;
  };
}

export interface ProcessedImage {
  id: string;
  originalImageId: string;
  filename: string;
  path: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  error?: string;
  tokens?: {
    promptTokens?: number;
    totalTokens?: number;
  };
  history?: ProcessedImageVersion[];
}

export interface ProcessingJob {
  id: string;
  images: UploadedImage[];
  prompt: string;
  results: ProcessedImage[];
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  totalImages: number;
  processedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  images: UploadedImage[];
  jobId: string;
}

export interface ProcessResponse {
  jobId: string;
  status: string;
  results: ProcessedImage[];
}

// 설정 타입
export interface AppConfig {
  uploadDir: string;
  resultDir: string;
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  openaiApiKey: string;
  openaiModel: string;
  imageModel: string;
  aiProvider: 'openai' | 'gemini';
}

// 로그 타입
export interface LogMessage {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: any;
}

// 배경색 프리셋 타입
export interface BackgroundColorPreset {
  id: string;
  name: string;
  colorCode: string;
}

// 프롬프트 프리셋 타입
export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
}
