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
	"google.golang.org/api/option"
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

	// "service-account.json" があるか確認 (ローカル開発用)
	if _, err := os.Stat("service-account.json"); err == nil {
		opt := option.WithCredentialsFile("service-account.json")
		firebaseApp, err = firebase.NewApp(ctx, nil, opt)
		log.Println("Initialized Firebase App with local service account file.")
	} else {
		// ファイルがない場合はADC (Application Default Credentials) を使用 (Cloud Run用)
		firebaseApp, err = firebase.NewApp(ctx, nil)
		log.Println("Initialized Firebase App with ADC (Cloud Run).")
	}

	if err != nil {
		log.Fatalf("error initializing firebase app: %v\n", err)
	}

	// 1.Logicの初期化
	geminiService, err := logic.NewGeminiService(ctx)
	if err != nil {
		log.Fatal("Failed to create Gemini service:", err)
	}
	defer geminiService.Close()

	tmdbService := logic.NewTmdbService()
	ogpService := logic.NewOgpService()

	historyService, err := logic.NewHistoryService(ctx, firebaseApp)
	if err != nil{
		log.Fatal("Failed to create History service:", err)
	}
	defer historyService.Close()

	userService, err := logic.NewUserService(ctx, firebaseApp)
	if err != nil {
		log.Fatal("Failed to crate User service:", err)
	}
	defer userService.Close()

	// 2.Handlerの初期化
	h := &handler.RecommendHandler{
		Gemini: geminiService,
		Tmdb:   tmdbService,
		User: userService,
	}
	ogpHandler := &handler.OgpHandler{Service: ogpService}
	historyHandler := &handler.HistoryHandler{Service: historyService}

	// ルーティング
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Typecast API is running!!!")
	})

	// OGP生成はTwitter等のBotが見に来るため認証なしにする
	authMiddleware := middleware.AuthMiddleware(firebaseApp)
	e.POST("/api/recommend", h.Recommend, authMiddleware)

	e.GET("/api/history", historyHandler.GetHistory, authMiddleware)
	e.POST("/api/history", historyHandler.SaveHistory, authMiddleware)

	e.GET("/api/ogp", ogpHandler.GenerateOgp)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s...", port)
	e.Logger.Fatal(e.Start(":" + port))
}
