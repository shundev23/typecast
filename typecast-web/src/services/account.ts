import { apiClient } from '../lib/apiClient';

export const accountService = {
  deleteAccount: async (token: string) => {
    return apiClient<{ status: string }>('/api/account', {
      method: 'DELETE',
      token,
    });
  },
};

