package logic

import (
	"context"
	"fmt"
	"time"
	"typecast/internal/model"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/option"
)

type UserService struct {
	Client *firestore.Client
}

func NewUserService(ctx context.Context, projectID string, dbName string, opts ...option.ClientOption) (*UserService, error) {
	client, err := firestore.NewClientWithDatabase(ctx, projectID, dbName, opts...)
	if err != nil {
		return nil, err
	}
	return &UserService{Client: client}, nil
}

func (s *UserService) Close() {
	if s.Client != nil {
		s.Client.Close()
	}
}

// CheckAndIncrementLimit : 利用制限チェック & カウントアップ
// 戻り値: (今の回数, 許可するかどうか, エラー)
func (s *UserService) CheckAndIncrementLimit(ctx context.Context, uid string, limit int) (int, bool, error) {
	docRef := s.Client.Collection("users").Doc(uid)

	// トランザクションを使って安全にカウントアップ
	// (同時にリクエストが来ても正確にカウントするため)
	var currentCount int
	err := s.Client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		var usage model.UserUsage

		// ドキュメントがまだない場合（初回ユーザー）
		if err != nil &&  (err.Error() == "rpc error: code = NotFound desc = " || err.Error() == "rpc error: code = NotFound desc = document not found") || !doc.Exists() {
			usage = model.UserUsage{
				Count:     0,
				LastReset: time.Now(),
			}
		} else if err != nil {
			return err
		} else {
			if err := doc.DataTo(&usage); err != nil {
				return err
			}
		}

		// 日付チェック (日本時間で判定)
		jst := time.FixedZone("Asia/Tokyo", 9*60*60)
		nowJST := time.Now().In(jst)
		lastResetJST := usage.LastReset.In(jst)

		// 日付が変わっていたらリセット
		if nowJST.Year() != lastResetJST.Year() || nowJST.YearDay() != lastResetJST.YearDay() {
			usage.Count = 0
			usage.LastReset = time.Now() // UTCで保存されるが比較時にJSTにするのでOK
		}

		// 制限チェック
		if usage.Count >= limit {
			currentCount = usage.Count
			return fmt.Errorf("limit_exceeded") // エラーとして脱出
		}

		// カウントアップして保存
		usage.Count++
		usage.LastReset = time.Now() // 更新時刻
		currentCount = usage.Count
		
		return tx.Set(docRef, usage)
	})

	if err != nil {
		if err.Error() == "limit_exceeded" {
			return currentCount, false, nil // 制限オーバー
		}
		return 0, false, err // その他のエラー
	}

	return currentCount, true, nil // 許可
}