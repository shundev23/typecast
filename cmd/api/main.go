package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"typecast/internal/handler"
	"typecast/internal/logic"
	"typecast/internal/middleware"

	firebase "firebase.google.com/go/v4"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Info: .env file not found. Using system environment variables.")
	}

	e := echo.New()
	e.Use(echoMiddleware.Logger())
	e.Use(echoMiddleware.Recover())
	e.Use(echoMiddleware.CORS())

	// --- DI（依存性の注入）開始
	ctx := context.Background()

	// Firebase Admin SDKの初期化
	var firebaseApp *firebase.App
	var err error

	// 1.Logicの初期化
	geminiService, err := logic.NewGeminiService(ctx)
	if err != nil {
		log.Fatal("Failed to create Gemini service:", err)
	}
	defer geminiService.Close()

	tmdbService := logic.NewTmdbService()
	ogpService := logic.NewOgpService()

	// 2.Handlerの初期化
	h := &handler.RecommendHandler{
		Gemini: geminiService,
		Tmdb:   tmdbService,
	}
	ogpHandler := &handler.OgpHandler{Service: ogpService}

	// ルーティング
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Typecast API is running!!!")
	})

	// OGP生成はTwitter等のBotが見に来るため認証なしにする
	authMiddleware := middleware.AuthMiddleware(firebaseApp)
	e.POST("/api/recommend", h.Recommend, authMiddleware)

	e.GET("/api/ogp", ogpHandler.GenerateOgp)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s...", port)
	e.Logger.Fatal(e.Start(":" + port))
}
