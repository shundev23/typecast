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
	godotenv.Load()
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

	// Firestore接続オプション
	var firestoreOpts []option.ClientOption
	if _, err := os.Stat("service-account.json"); err == nil {
		firestoreOpts = append(firestoreOpts, option.WithCredentialsFile("service-account.json"))
	}

	projectID := os.Getenv("VITE_FIREBASE_PROJECT_ID")
	if projectID == ""{
		// 設定忘れはFatalで落とす、もしくはログで警告
		log.Fatal("Error: FIREBASE_PROJECT_ID environment variable is not set.")
	}

	databaseID := os.Getenv("FIRESTORE_DB_NAME")
	if databaseID == ""{
		log.Fatal("Error: FIRESTORE_DB_NAME is not set")
	}

	conf := &firebase.Config{ProjectID: projectID}
	firebaseApp, err = firebase.NewApp(ctx, conf)
	log.Println("Initialized Firebase App with ADC and Project ID:", projectID)

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
	shareService, err := logic.NewShareService(ctx, projectID, databaseID, firestoreOpts...)
	if err != nil {
		log.Fatal("Failed to create Share service:", err)
	}
	defer shareService.Close()

	historyService, err := logic.NewHistoryService(ctx, projectID, databaseID, firestoreOpts...)
	if err != nil{
		log.Fatal("Failed to create History service:", err)
	}
	defer historyService.Close()

	userService, err := logic.NewUserService(ctx, projectID, databaseID, firestoreOpts...)
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

	ogpHandler := handler.NewOgpHandler(ogpService)
	historyHandler := &handler.HistoryHandler{Service: historyService}
	shareHandler := handler.NewShareHandler(shareService)

	// ルーティング
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Typecast API is running!!!")
	})

	// OGP生成はTwitter等のBotが見に来るため認証なしにする
	authMiddleware := middleware.AuthMiddleware(firebaseApp)
	e.POST("/api/recommend", h.Recommend, authMiddleware)

	e.GET("/api/history", historyHandler.GetHistory, authMiddleware)
	e.POST("/api/history", historyHandler.SaveHistory, authMiddleware)

	e.GET("/api/ogp", ogpHandler.GetOgpImage)
	e.POST("/api/share", shareHandler.Create)

	e.GET("/s/:id", shareHandler.HandleShareLink)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s...", port)
	e.Logger.Fatal(e.Start(":" + port))
}
