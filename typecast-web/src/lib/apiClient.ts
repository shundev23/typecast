const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// カスタムエラークラスの定義
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: unknown;
  token?: string;
};

export const apiClient = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', headers = {}, body, token } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // エラーレスポンスの取得を試みる
    const errorData = await response.json().catch(() => null);
    
    throw new ApiError(
      errorData?.error || `API Error: ${response.status}`,
      response.status,
      errorData
    );
  }

  return response.json();
};