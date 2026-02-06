import { apiClient } from '../lib/apiClient';
import type { HistoryItem, ApiHistoryItem, SaveHistoryRequest } from '../types';

export const historyService = {
  // 履歴を取得し、Date型に変換して返す
  fetchAll: async (token: string): Promise<HistoryItem[]> => {
    const data = await apiClient<ApiHistoryItem[] | null>('/api/history', {
      method: 'GET',
      token,
    });

    if (data == null || !Array.isArray(data)) {
      return [];
    }

    // 変換処理 (DTO -> Domain Model)
    return data.map((item) => ({
      ...item,
      poster: item.poster ?? '',
      timestamp: new Date(item.timestamp),
    }));
  },

  // 履歴を保存
  save: async (payload: SaveHistoryRequest, token: string) => {
    return apiClient('/api/history', {
      method: 'POST',
      body: payload,
      token,
    });
  }
};