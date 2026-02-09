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

// UIで使う履歴データ（Date型、レコメンド表示と同様の情報）
export type HistoryItem = {
  title: string;
  year: string;
  poster: string;
  reason_main: string;
  reason_sub: string;
  label_main: string;
  label_sub: string;
  providers?: Provider[];
  timestamp: Date;
  score: number;
  mood: string;
  sentiment_label: string;
};

// APIから返ってくる履歴データ（日付が文字列）
export type ApiHistoryItem = {
  title: string;
  year?: string;
  poster?: string;
  reason_main?: string;
  reason_sub?: string;
  label_main?: string;
  label_sub?: string;
  providers?: Provider[];
  timestamp: string;
  score: number;
  mood: string;
  sentiment_label?: string;
};

// 履歴保存時のリクエストボディ
export type SaveHistoryRequest = {
  movies: Array<{
    title: string;
    year: string;
    poster: string;
    reason_main: string;
    reason_sub: string;
    label_main: string;
    label_sub: string;
    providers?: Provider[];
  }>;
  mood: string;
  score: number;
  sentiment_label: string;
};

// フィードバック（評価）データ
export type Feedback = {
  title: string;
  type: FeedbackType;
  created_at: string; // ISO 8601形式
};