
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "./types";

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "15字以内的画面概括" },
    category: { type: Type.STRING, enum: ['人物', '风景', '产品', '家居', '动漫', '建筑', '其他'] },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5-8个核心标签" },
    fullPrompt: { type: Type.STRING, description: "详细中文描述，包括构图、风格、光影、材质细节等要素，注意不要包含任何相机型号、滤镜名称或具体的相机参数信息" },
    cameraInfo: { type: Type.STRING, description: "识别或推测的相机型号、镜头、滤镜及具体参数（如 f/2.8, 1/100s, ISO 100）" },
    materialDescription: { type: Type.STRING, description: "详细描述画面中主要物体的材质和表面纹理（如：拉丝金属、细腻丝绸、粗糙混凝土、晶莹剔透的玻璃）" },
  },
  required: ["summary", "category", "tags", "fullPrompt", "cameraInfo", "materialDescription"],
};

export const analyzeImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
        { text: "请分析这张图片。要求：1. 输出包含简述、分类、关键词。2. 完整提示词：需包含详尽的画面描述，并专业地融入材质纹理描述（如哑光、抛光、织物纹理）。注意：完整提示词中严禁出现相机型号、滤镜名称或具体的相机参数（如 f/stop, ISO 等）。3. 材质描述：单独提取画面核心元素的质感。4. 结果以JSON格式输出。" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_SCHEMA
    }
  });

  return JSON.parse(response.text || '{}') as AnalysisResult;
};

export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = 1000;
        const scale = targetWidth / img.width;
        canvas.width = targetWidth;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};
