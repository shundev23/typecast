package logic

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"google.golang.org/api/option"
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

func NewShareService(ctx context.Context, projectID string, dbName string, opts ...option.ClientOption) (*ShareService, error) {
	client, err := firestore.NewClientWithDatabase(ctx, projectID, dbName, opts...)
	if err != nil {
		return nil, err
	}
	return &ShareService{Client: client}, nil
}

// Close : クライアントを閉じる
func (s *ShareService) Close() {
	if s.Client != nil {
		s.Client.Close()
	}
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