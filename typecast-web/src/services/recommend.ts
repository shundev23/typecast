import { apiClient } from '../lib/apiClient';
import type { RecommendResponse } from '../types';

export const recommendService = {
  // 診断を実行
  analyze: async (mbti: string, mood: string, ignoreMovies: string[], token: string) => {
    return apiClient<RecommendResponse>('/api/recommend', {
      method: 'POST',
      token,
      body: { 
        mbti, 
        mood, 
        ignore_movies: ignoreMovies 
      },
    });
  }
};