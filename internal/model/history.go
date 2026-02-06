package model

import "time"

// HistoryItem : Firestoreに保存/取得する履歴データの構造体（レコメンド表示と同様の情報を保持）
type HistoryItem struct {
	Title         string    `firestore:"title" json:"title"`
	Year          string    `firestore:"year" json:"year"`
	Poster        string    `firestore:"poster" json:"poster"`
	ReasonMain    string    `firestore:"reason_main" json:"reason_main"`
	ReasonSub     string    `firestore:"reason_sub" json:"reason_sub"`
	LabelMain     string    `firestore:"label_main" json:"label_main"`
	LabelSub      string    `firestore:"label_sub" json:"label_sub"`
	Providers     []Provider `firestore:"providers" json:"providers"`
	Mood          string    `firestore:"mood" json:"mood"`
	Score         int       `firestore:"score" json:"score"`
	SentimentLabel string   `firestore:"sentiment_label" json:"sentiment_label"`
	Timestamp     time.Time `firestore:"timestamp" json:"timestamp"`
}

// SaveHistoryRequest : フロントエンドから送られてくる保存リクエスト
type SaveHistoryRequest struct {
	Movies         []HistoryItem `json:"movies"`
	Mood           string        `json:"mood"`
	Score          int           `json:"score"`
	SentimentLabel string        `json:"sentiment_label"`
}