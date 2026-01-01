import { apiClient } from '../lib/apiClient';

export const shareService = {
  createLink: async (title: string, mood: string, score: number) => {
    return apiClient<{ share_url: string }>('/api/share', {
      method: 'POST',
      body: { title, mood, score },
    });
  }
};