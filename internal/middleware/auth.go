package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/labstack/echo/v4"
	"typecast/internal/security"
)

// AuthMiddleware : Firebase ID Tokenを検証するミドルウェア
func AuthMiddleware(app *firebase.App, fs *firestore.Client) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// 1. Authorizationヘッダーの取得
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Missing Authorization header"})
			}

			// 2. "Bearer <token>" 形式のチェック
			tokenParts := strings.Split(authHeader, " ")
			if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid Authorization header format"})
			}
			idToken := tokenParts[1]

			// 3. Firebaseでトークン検証
			client, err := app.Auth(context.Background())
			if err != nil {
				log.Printf("[Auth] error=auth_client_init err=%v", err)
				return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to initialize auth client"})
			}

			token, err := client.VerifyIDToken(context.Background(), idToken)
			if err != nil {
				log.Printf("[Auth] error=verify_token_failed err=%v", err)
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Invalid or expired token"})
			}

			// 追加セーフティ: 削除済み（リセマラ）対策
			// 同一プロバイダアカウントが削除済みならクールダウン中は拒否する
			if fs != nil {
				providerID, providerUID := security.ExtractPrimaryIdentity(token.Claims)
				if providerID != "" && providerUID != "" {
					docID := security.DeletedIdentityDocID(providerID, providerUID)
					doc, err := fs.Collection("deleted_identities").Doc(docID).Get(context.Background())
					if err == nil && doc.Exists() {
						var rec struct {
							BlockForever  bool      `firestore:"block_forever"`
							CooldownUntil time.Time `firestore:"cooldown_until"`
						}
						if err := doc.DataTo(&rec); err == nil {
							now := time.Now()
							if rec.BlockForever || (!rec.CooldownUntil.IsZero() && now.Before(rec.CooldownUntil)) {
								return c.JSON(http.StatusForbidden, map[string]any{
									"error":         "このアカウントは削除済みのため、一定時間APIを利用できません。",
									"code":          "account_deleted_cooldown",
									"cooldownUntil": rec.CooldownUntil,
								})
							}
						}
					}
				}
			}

			// 4. 検証成功 → コンテキストにUIDをセットして次の処理へ
			c.Set("uid", token.UID)

			return next(c)
		}
	}
}
