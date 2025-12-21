package model

import "time"

type UserUsage struct {
	Count     int       `firestore:"count" json:"count"`           // 今日の実行回数
	LastReset time.Time `firestore:"last_reset" json:"last_reset"` // 最後にカウントをリセットした日時
}