package logic

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
)

type ShareData struct {
	ID        string    `firestore:"id"`
	Title     string    `firestore:"title"`
	Mood      string    `firestore:"mood"`
	Score     int       `firestore:"score"`
	CreatedAt time.Time `firestore:"created_at"`
}

type ShareService struct {
	Client *firestore.Client
}

// NewShareService : main.goで作られたclientを受け取る形に変更
func NewShareService(client *firestore.Client) *ShareService {
	return &ShareService{Client: client}
}

// CreateShare : シェアデータを保存し、IDを返す
func (s *ShareService) CreateShare(ctx context.Context, title, mood string, score int) (string, error) {
	// 短いIDを生成 (UUIDの最初8文字を使う簡易版)
	id := uuid.New().String()[:8]

	data := ShareData{
		ID:        id,
		Title:     title,
		Mood:      mood,
		Score:     score,
		CreatedAt: time.Now(),
	}

	// "shares" コレクションに保存
	_, err := s.Client.Collection("shares").Doc(id).Set(ctx, data)
	if err != nil {
		return "", err
	}

	return id, nil
}

// GetShare : IDからシェアデータを取得
func (s *ShareService) GetShare(ctx context.Context, id string) (*ShareData, error) {
	doc, err := s.Client.Collection("shares").Doc(id).Get(ctx)
	if err != nil {
		return nil, err
	}

	var data ShareData
	if err := doc.DataTo(&data); err != nil {
		return nil, err
	}
	return &data, nil
}