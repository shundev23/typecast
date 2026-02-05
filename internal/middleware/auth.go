package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	firebase "firebase.google.com/go/v4"
	"github.com/labstack/echo/v4"
)

// AuthMiddleware : Firebase ID Tokenを検証するミドルウェア
func AuthMiddleware(app *firebase.App) echo.MiddlewareFunc {
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

			// 4. 検証成功 → コンテキストにUIDをセットして次の処理へ
			c.Set("uid", token.UID)
			
			return next(c)
		}
	}
}