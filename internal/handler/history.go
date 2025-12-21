package handler

import (
	"log"
	"net/http"
	"typecast/internal/logic"
	"typecast/internal/model"

	"github.com/labstack/echo/v4"
)

type HistoryHandler struct {
	Service *logic.HistoryService
}

// GetHistory : 履歴を取得するハンドラー
func (h *HistoryHandler) GetHistory(c echo.Context) error {
	// AuthMiddlewareでセットされたUIDを取得 (型アサーションを使用)
	uid, ok := c.Get("uid").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "User ID not found in context"})
	}

	history, err := h.Service.GetHistory(c.Request().Context(), uid)
	if err != nil {
		log.Printf("Failed to fetch history for user %s: %v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch history"})
	}

	return c.JSON(http.StatusOK, history)
}

// SaveHistory : 履歴を保存するハンドラー
func (h *HistoryHandler) SaveHistory(c echo.Context) error {
	uid, ok := c.Get("uid").(string)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "User ID not found in context"})
	}

	var req model.SaveHistoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}

	if err := h.Service.SaveHistory(c.Request().Context(), uid, req); err != nil {
		log.Printf("Failed to save history for user %s: %v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to save history"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "History saved successfully"})
}