package model

import "time"

// HistoryItem : Firestoreに保存/取得する履歴データの構造体
type HistoryItem struct {
	Title     string    `firestore:"title" json:"title"`
	Poster    string    `firestore:"poster" json:"poster"`
	Mood      string    `firestore:"mood" json:"mood"`
	Score     int       `firestore:"score" json:"score"`
	Timestamp time.Time `firestore:"timestamp" json:"timestamp"`
}

// SaveHistoryRequest : フロントエンドから送られてくる保存リクエスト
type SaveHistoryRequest struct {
	Movies []HistoryItem `json:"movies"`
	Mood   string        `json:"mood"`
	Score  int           `json:"score"`
}