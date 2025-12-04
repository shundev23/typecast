package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	godotenv.Load() // .env読み込み
	ctx := context.Background()

	// APIキー確認
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		fmt.Println("Error: GEMINI_API_KEY is empty")
		return
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(key))
	if err != nil {
		fmt.Println("Client Error:", err)
		return
	}
	defer client.Close()

	fmt.Println("--- あなたのAPIキーで使えるモデル一覧 ---")
	iter := client.ListModels(ctx)
	foundFlash := false
	for {
		m, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			fmt.Println("ListModels Error:", err)
			break
		}
		fmt.Println(m.Name)
		if m.Name == "models/gemini-1.5-flash" {
			foundFlash = true
		}
	}

	fmt.Println("---------------------------------------")
	if foundFlash {
		fmt.Println("判定: Flashモデルは「存在します」。コードの修正反映ミスを疑ってください。")
	} else {
		fmt.Println("判定: Flashモデルが「一覧にありません」。APIキーまたはSDKの向き先が古いです。")
	}
}
