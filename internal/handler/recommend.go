package handler

import (
	"log"
	"net/http"
	"strings"
	"typecast/internal/logic"
	"typecast/internal/model"

	"github.com/labstack/echo/v4"
)

type RecommendHandler struct {
	Gemini *logic.GeminiService
	Tmdb   *logic.TmdbService
	User   *logic.UserService
	// 1日あたりのレコメンド上限（環境変数等で注入）
	DailyRecommendLimit int
}

func (h *RecommendHandler) Recommend(c echo.Context) error {
	log.Printf("[Recommend] start")

	// 1.ユーザーIDの取得
	uid, ok := c.Get("uid").(string)
	if !ok {
		log.Printf("[Recommend] error=unauthorized reason=uid_not_found")
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "User ID not found"})
	}
	log.Printf("[Recommend] uid=%s", uid)

	limit := h.DailyRecommendLimit
	if limit <= 0 {
		limit = 3
	}

	// 利用制限チェック(1日N回まで)
	count, allowed, err := h.User.CheckAndIncrementLimit(c.Request().Context(), uid, limit)
	if err != nil {
		log.Printf("[Recommend] error=limit_check_failed uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to check limit"})
	}
	if !allowed {
		log.Printf("[Recommend] error=rate_limited uid=%s count=%d", uid, count)
		return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
			"error":     "Daily limit exceeded",
			"code":      "daily_limit",
			"limit":     limit,
			"count":     count,
			"remaining": 0,
		})
	}
	remaining := limit - count
	if remaining < 0 {
		remaining = 0
	}

	var req model.RecommendRequest
	if err := c.Bind(&req); err != nil {
		log.Printf("[Recommend] error=bind_failed err=%v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}
	if req.MBTI == "" {
		req.MBTI = "INTP"
	}
	log.Printf("[Recommend] mbti=%s mood_len=%d ignore_count=%d", req.MBTI, len(req.Mood), len(req.IgnoreMovies))

	// 1. Geminiから映画リスト(JSON)を取得
	log.Printf("[Recommend] calling_gemini")
	geminiResp, err := h.Gemini.GetRecommendations(c.Request().Context(), req.MBTI, req.Mood, req.IgnoreMovies)
	if err != nil {
		log.Printf("[Recommend] error=gemini_failed err=%v", err)
		errStr := err.Error()
		// Gemini API のクォータ超過は 429 で返し、フロントで専用メッセージを出せるようにする
		if strings.Contains(errStr, "429") || strings.Contains(errStr, "quota") || strings.Contains(errStr, "Quota exceeded") {
			return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
				"error": "Gemini APIの利用制限に達しました。しばらく待ってから再試行するか、Google AI Studioで利用量を確認してください。",
				"code":  "gemini_quota",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": errStr})
	}
	log.Printf("[Recommend] gemini_ok movies=%d", len(geminiResp.Movies))

	// 2. 各映画についてTMDBで画像を検索・付与
	for i := range geminiResp.Movies {
		posterURL, providers := h.Tmdb.GetMovieMetadata(geminiResp.Movies[i].Title)

		// 画像がない場合は適当なプレースホルダーを入れるか、空文字のままにする
		if posterURL == "" {
			posterURL = "https://placehold.co/500x750?text=No+Image"
		}
		geminiResp.Movies[i].Poster = posterURL
		geminiResp.Movies[i].Providers = providers
	}

	log.Printf("[Recommend] success uid=%s movies=%d", uid, len(geminiResp.Movies))
	// 残り回数の見える化（フロントで「本日残りN回」を出せる）
	return c.JSON(http.StatusOK, struct {
		model.RecommendResponse
		Limit     int `json:"limit"`
		Count     int `json:"count"`
		Remaining int `json:"remaining"`
	}{
		RecommendResponse: geminiResp,
		Limit:             limit,
		Count:             count,
		Remaining:         remaining,
	})
}
