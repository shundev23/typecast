package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"typecast/internal/handler"
	"typecast/internal/logic"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	f, err := os.OpenFile("debug.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()

	if err := godotenv.Load(); err != nil {
		log.Println("Info: .env file not found. Using system environment variables.")
	}

	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// CORS設定
	e.Use(middleware.CORS())

	// --- DI（依存性の注入）開始
	ctx := context.Background()

	// 1.Logicの初期化
	geminiService, err := logic.NewGeminiService(ctx)
	if err != nil {
		log.Fatal("Failed to create Gemini service:", err)
	}
	defer geminiService.Close()

	tmdbService := logic.NewTmdbService()

	// 2.Handlerの初期化
	h := &handler.RecommendHandler{
		Gemini: geminiService,
		Tmdb:   tmdbService,
	}

	// ルーティング
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Typecast API is running!!!")
	})

	e.POST("/api/recommend", h.Recommend)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
}
