package handler

import (
	"net/http"
	"typecast/internal/logic"
	"typecast/internal/model"

	"github.com/labstack/echo/v4"
)

type RecommendHandler struct {
	Gemini *logic.GeminiService
	Tmdb   *logic.TmdbService
}

func (h *RecommendHandler) Recommend(c echo.Context) error {

	var req model.RecommendRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	if req.MBTI == "" {
		req.MBTI = "INTP"
	}

	// 1. Geminiから映画リスト(JSON)を取得
	geminiResp, err := h.Gemini.GetRecommendations(c.Request().Context(), req.MBTI, req.Mood, req.IgnoreMovies)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

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

	return c.JSON(http.StatusOK, geminiResp)
}
