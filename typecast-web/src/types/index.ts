// 既存のFeedbackTypeなどに加えて以下を追加

export type FeedbackType = 'good' | 'bad' | 'watched';

export type Provider = {
  name: string;
  logo: string;
  link: string;
};

export type Movie = {
  title: string;
  year: string;
  reason_main: string;
  reason_sub: string;
  label_main: string;
  label_sub: string;
  poster: string;
  providers?: Provider[];
};

export type RecommendResponse = {
  sentiment_score: number;
  movies: Movie[];
  // 日次レコメンド制限（バックエンドが返す場合のみ）
  limit?: number;
  count?: number;
  remaining?: number;
};

// UIで使う履歴データ（Date型）
export type HistoryItem = {
  title: string;
  timestamp: Date;
  score: number;
  mood: string;
};

// APIから返ってくる履歴データ（日付が文字列）
export type ApiHistoryItem = {
  title: string;
  timestamp: string;
  score: number;
  mood: string;
};

// 履歴保存時のリクエストボディ
export type SaveHistoryRequest = {
  movies: {
    title: string;
    poster: string;
  }[];
  mood: string;
  score: number;
};