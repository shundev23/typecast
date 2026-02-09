// src/services/feedback.ts
import { apiClient } from '../lib/apiClient';
import type { FeedbackType, Feedback } from '../types';

export const feedbackService = {
  // 評価を送信
  sendFeedback: async (title: string, type: FeedbackType, token: string) => {
    return apiClient<{ status: string }>('/api/feedback', {
      method: 'POST',
      token,
      body: { title, type },
    });
  },

  // 自分の評価一覧を取得
  getFeedbacks: async (token: string): Promise<Feedback[]> => {
    return apiClient<Feedback[]>('/api/feedback', {
      method: 'GET',
      token,
    });
  }
};