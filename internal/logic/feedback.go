package logic

import (
	"context"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

type FeedbackType string

const (
	FeedbackGood    FeedbackType = "good"
	FeedbackBad     FeedbackType = "bad"
	FeedbackWatched FeedbackType = "watched"
)

type Feedback struct {
	Title     string       `firestore:"title" json:"title"`
	Type      FeedbackType `firestore:"type" json:"type"`
	CreatedAt time.Time    `firestore:"created_at" json:"created_at"`
}

type FeedbackService struct {
	Client *firestore.Client
}

func NewFeedbackService(client *firestore.Client) *FeedbackService {
	return &FeedbackService{Client: client}
}

// SaveFeedback : 評価を保存（上書き）
func (s *FeedbackService) SaveFeedback(ctx context.Context, uid string, title string, fbType FeedbackType) error {
	// ドキュメントIDをタイトルにして、重複を防ぐ＆検索しやすくする
	// ※タイトルにスラッシュなどが含まれるとエラーになる可能性があるため、ハッシュ化するのが安全だが、
	// 一旦シンプルにタイトルをIDとして試す（運用で問題が出たらハッシュ化を検討）
	docRef := s.Client.Collection("users").Doc(uid).Collection("feedbacks").Doc(title)

	data := Feedback{
		Title:     title,
		Type:      fbType,
		CreatedAt: time.Now(),
	}

	_, err := docRef.Set(ctx, data)
	return err
}

// GetExcludeTitles : レコメンドから除外すべき映画タイトル一覧を取得
// (Bad と Watched の映画タイトルを返す)
func (s *FeedbackService) GetExcludeTitles(ctx context.Context, uid string) ([]string, error) {
	var titles []string
	iter := s.Client.Collection("users").Doc(uid).Collection("feedbacks").Documents(ctx)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var fb Feedback
		if err := doc.DataTo(&fb); err != nil {
			continue
		}

		// Bad または Watched の場合のみリストに追加
		if fb.Type == FeedbackBad || fb.Type == FeedbackWatched {
			titles = append(titles, fb.Title)
		}
	}
	return titles, nil
}

// GetAllFeedbacks : ユーザーの全評価データを取得（画面表示用）
func (s *FeedbackService) GetAllFeedbacks(ctx context.Context, uid string) ([]Feedback, error) {
	var feedbacks []Feedback
	// 作成日順（新しい順）で取得
	iter := s.Client.Collection("users").Doc(uid).Collection("feedbacks").OrderBy("created_at", firestore.Desc).Documents(ctx)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}

		var fb Feedback
		if err := doc.DataTo(&fb); err != nil {
			continue
		}
		feedbacks = append(feedbacks, fb)
	}
	return feedbacks, nil
}