package handler

import (
	"net/http"
	"typecast/internal/logic"

	"github.com/labstack/echo/v4"
)

type FeedbackHandler struct {
	Service *logic.FeedbackService
}

func NewFeedbackHandler(service *logic.FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{Service: service}
}

// Save : 評価を保存 (POST /api/feedback)
func (h *FeedbackHandler) Save(c echo.Context) error {
	// AuthMiddlewareでセットされたUIDを取得
	uid, ok := c.Get("uid").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	// リクエストボディのパース
	type Request struct {
		Title string             `json:"title"`
		Type  logic.FeedbackType `json:"type"`
	}
	var req Request
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	// バリデーション
	if req.Title == "" || (req.Type != logic.FeedbackGood && req.Type != logic.FeedbackBad && req.Type != logic.FeedbackWatched) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid parameters"})
	}

	// 保存処理
	if err := h.Service.SaveFeedback(c.Request().Context(), uid, req.Title, req.Type); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save feedback"})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "success"})
}

// GetAll : 全評価を取得 (GET /api/feedback)
// ※「マイリスト」画面用
func (h *FeedbackHandler) GetAll(c echo.Context) error {
	uid, ok := c.Get("uid").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	feedbacks, err := h.Service.GetAllFeedbacks(c.Request().Context(), uid)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch feedbacks"})
	}

	return c.JSON(http.StatusOK, feedbacks)
}