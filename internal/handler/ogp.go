package handler

import (
	"net/http"
	"strconv"
	"typecast/internal/logic"

	"github.com/labstack/echo/v4"
)

type OgpHandler struct {
	Service *logic.OgpService
}

func NewOgpHandler(service *logic.OgpService) *OgpHandler {
	return &OgpHandler{Service: service}
}

// GET /api/ogp?title=Matrix&mood=Excited&score=5
func (h *OgpHandler) GetOgpImage(c echo.Context) error {
	title := c.QueryParam("title")
	mood := c.QueryParam("mood")
	scoreStr := c.QueryParam("score")

	// デフォルト値
	if title == "" {
		title = "TYPECAST"
	}
	// エラーハンドリング省略（0になるだけなのでOK）
	score, _ := strconv.Atoi(scoreStr)

	// 画像生成
	imgBytes, err := h.Service.GenerateImage(title, mood, score)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to generate image"})
	}

	// キャッシュヘッダーを設定（24時間）
	c.Response().Header().Set("Cache-Control", "public, max-age=86400")

	// バイナリデータを "image/png" として返す
	return c.Blob(http.StatusOK, "image/png", imgBytes)
}
