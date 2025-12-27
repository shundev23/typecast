package handler

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"typecast/internal/logic"

	"github.com/labstack/echo/v4"
)

type ShareHandler struct {
	ShareService *logic.ShareService
	// フロントエンドのURL
	FrontendURL string
	// APIのベースURL (OGP画像の指定用)
	APIBaseURL string
}

func NewShareHandler(service *logic.ShareService) *ShareHandler {
	// 環境変数からエンドポイントを取得
	frontend := os.Getenv("FRONTEND_URL")
	if frontend == "" {
		frontend = "http://localhost:5173" // デフォルト値
	}

	apiBase := os.Getenv("API_BASE_URL")
	if apiBase == "" {
		apiBase = "http://localhost:8080" // デフォルト値
	}

	return &ShareHandler{
		ShareService: service,
		FrontendURL:  frontend,
		APIBaseURL:   apiBase,
	}
}

// Create : シェアボタンを押した時に呼ばれる (POST /api/share)
func (h *ShareHandler) Create(c echo.Context) error {
	type Request struct {
		Title string `json:"title"`
		Mood  string `json:"mood"`
		Score int    `json:"score"`
	}
	var req Request
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	id, err := h.ShareService.CreateShare(c.Request().Context(), req.Title, req.Mood, req.Score)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save share data"})
	}

	// シェア用URLを返す
	shareURL := fmt.Sprintf("%s/s/%s", h.APIBaseURL, id)
	return c.JSON(http.StatusOK, map[string]string{"share_url": shareURL})
}

// HandleShareLink : XなどでシェアされるURL (GET /s/:id)
func (h *ShareHandler) HandleShareLink(c echo.Context) error {
	id := c.Param("id")
	ctx := c.Request().Context()

	// 1. データ取得
	data, err := h.ShareService.GetShare(ctx, id)
	if err != nil {
		return c.String(http.StatusNotFound, "Share link not found")
	}

	// 2. User-Agent判定 (Botかどうか)
	ua := c.Request().UserAgent()
	if isBot(ua) {
		// Botの場合: OGPメタタグを含んだHTMLを返す
		// 画像URLを構築
		imgURL := fmt.Sprintf("%s/api/ogp?title=%s&mood=%s&score=%d", 
			h.APIBaseURL, data.Title, data.Mood, data.Score)
		
		html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>TYPECAST Analysis: %s</title>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="TYPECAST: %s" />
	<meta name="twitter:description" content="Mood: %s | Sentiment: %d" />
	<meta name="twitter:image" content="%s" />
	<meta property="og:title" content="TYPECAST: %s" />
	<meta property="og:image" content="%s" />
</head>
<body>
	<h1>Redirecting...</h1>
</body>
</html>`, data.Title, data.Title, data.Mood, data.Score, imgURL, data.Title, imgURL)

		return c.HTML(http.StatusOK, html)
	}

	// bot以外の場合: フロントエンドへリダイレクト
	redirectURL := fmt.Sprintf("%s?share_id=%s", h.FrontendURL, id)
	return c.Redirect(http.StatusFound, redirectURL)
}

// 簡易的なBot判定
func isBot(ua string) bool {
	ua = strings.ToLower(ua)
	bots := []string{
		"twitterbot",
		"facebookexternalhit",
		"linkedinbot",
		"slackbot-linkexpanding",
		"discordbot",
		"whatsapp",
	}
	for _, bot := range bots {
		if strings.Contains(ua, bot) {
			return true
		}
	}
	return false
}