package logic

import (
	"context"
	"log"
	"time"
	"typecast/internal/model"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/iterator"
)

type HistoryService struct {
	Client *firestore.Client
}

// NewHistoryService : Firestoreクライアントを初期化
func NewHistoryService(ctx context.Context, app *firebase.App) (*HistoryService, error) {
	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}
	return &HistoryService{Client: client}, nil
}

// Close : クライアントを閉じる
func (s *HistoryService) Close() {
	if s.Client != nil {
		s.Client.Close()
	}
}

// GetHistory : 指定したユーザー(uid)の履歴を取得
func (s *HistoryService) GetHistory(ctx context.Context, uid string) ([]model.HistoryItem, error) {
	var items []model.HistoryItem
	
	// users/{uid}/history コレクションを参照
	iter := s.Client.Collection("users").Doc(uid).Collection("history").
		OrderBy("timestamp", firestore.Desc). // 新しい順
		Documents(ctx)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var item model.HistoryItem
		if err := doc.DataTo(&item); err != nil {
			log.Printf("Failed to map history item: %v", err)
			continue
		}
		items = append(items, item)
	}

	return items, nil
}

// SaveHistory : 映画リストを履歴として保存
func (s *HistoryService) SaveHistory(ctx context.Context, uid string, req model.SaveHistoryRequest) error {
	batch := s.Client.Batch()
	historyCol := s.Client.Collection("users").Doc(uid).Collection("history")

	for _, movie := range req.Movies {
		// タイトルのスラッシュを置換（ドキュメントIDに使えないため）
		
		docRef := historyCol.Doc(movie.Title) // タイトルをIDにする
		
		// 保存データを作成
		// Timestampはサーバー側で現在時刻を入れるのが確実
		movie.Timestamp = time.Now()
		// リクエスト全体のMood/Scoreを個別の映画データにも紐付ける（分析用）
		movie.Mood = req.Mood
		movie.Score = req.Score

		batch.Set(docRef, movie)
	}

	_, err := batch.Commit(ctx)
	return err
}