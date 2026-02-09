package handler

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
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
	isUserBot := isBot(ua)
	
	// デバッグログ
	log.Printf("Share link accessed: id=%s, UA=%s, isBot=%v", id, ua, isUserBot)
	
	if isUserBot {
		// Botの場合: OGPメタタグを含んだHTMLを返す
		// 画像URLを構築
		// タイトルやムードに日本語・スペース等が含まれても壊れないようURLエンコードする
		imgURL := fmt.Sprintf(
			"%s/api/ogp?title=%s&mood=%s&score=%d",
			h.APIBaseURL,
			url.QueryEscape(data.Title),
			url.QueryEscape(data.Mood),
			data.Score,
		)
		
		// OGP用のタイトルと説明を構築
		ogTitle := fmt.Sprintf("TYPECAST: %s", data.Title)
		ogDescription := fmt.Sprintf("Mood: %s | Sentiment Score: %d", data.Mood, data.Score)
		
		html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>TYPECAST Analysis: %s</title>
	
	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="%s/s/%s" />
	<meta property="og:title" content="%s" />
	<meta property="og:description" content="%s" />
	<meta property="og:image" content="%s" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	
	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="%s/s/%s" />
	<meta name="twitter:title" content="%s" />
	<meta name="twitter:description" content="%s" />
	<meta name="twitter:image" content="%s" />
	
	<meta http-equiv="refresh" content="0;url=%s?share_id=%s">
</head>
<body>
	<h1>Redirecting to TYPECAST...</h1>
	<p>If you are not redirected automatically, <a href="%s?share_id=%s">click here</a>.</p>
</body>
</html>`, 
			data.Title,
			h.APIBaseURL, id,
			ogTitle, ogDescription, imgURL,
			h.APIBaseURL, id,
			ogTitle, ogDescription, imgURL,
			h.FrontendURL, id,
			h.FrontendURL, id,
		)

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
		"facebookcatalog",
		"linkedinbot",
		"slackbot",
		"slackbot-linkexpanding",
		"discordbot",
		"whatsapp",
		"telegrambot",
		"line",
		"skypeuripreview",
		"pinterest",
		"googlebot",
		"bingbot",
		"baiduspider",
		"yandexbot",
		"applebot",
	}
	for _, bot := range bots {
		if strings.Contains(ua, bot) {
			return true
		}
	}
	return false
}