import { apiClient } from '../lib/apiClient';

export const accountService = {
  deleteAccount: async (token: string, confirm: string) => {
    return apiClient<{ status: string }>('/api/account', {
      method: 'DELETE',
      token,
      body: { confirm },
    });
  },
};

