// src/services/feedback.ts
import { apiClient } from '../lib/apiClient';
import type { FeedbackType } from '../types'; // 型を利用

export const feedbackService = {
  // 評価を送信
  sendFeedback: async (title: string, type: FeedbackType, token: string) => {
    return apiClient<{ status: string }>('/api/feedback', {
      method: 'POST',
      token,
      body: { title, type },
    });
  },

  // (将来的に) 自分の評価一覧を取得
  getFeedbacks: async (token: string) => {
    // 型定義は後でちゃんと作るとして、一旦 any か専用の型
    return apiClient<any[]>('/api/feedback', {
      method: 'GET',
      token,
    });
  }
};