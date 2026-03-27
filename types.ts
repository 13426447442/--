
export type Category = '人物' | '风景' | '产品' | '家居' | '动漫' | '建筑' | '其他';

export interface PromptEntry {
  id: string;
  thumbnail: string;
  summary: string;
  category: Category;
  tags: string[];
  fullPrompt: string;
  originalPrompt?: string; // 新增：保留原始 AI 生成的提示词
  cameraInfo?: string;
  materialDescription?: string;
  createdAt: number;
}

export interface AnalysisResult {
  summary: string;
  category: Category;
  tags: string[];
  fullPrompt: string;
  cameraInfo: string;
  materialDescription: string;
}

export interface ProcessingState {
  total: number;
  current: number;
  isProcessing: boolean;
}
