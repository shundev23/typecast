package logic

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"typecast/internal/model" // パッケージパスは環境に合わせて確認してください

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiService struct {
	client *genai.Client
	model  *genai.GenerativeModel
}

func NewGeminiService(ctx context.Context) (*GeminiService, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}

	// モデル設定
	geminiModel := client.GenerativeModel("gemini-2.0-flash")

	// ★重要: レスポンスをJSONに固定する設定
	geminiModel.ResponseMIMEType = "application/json"

	return &GeminiService{
		client: client,
		model:  geminiModel,
	}, nil
}

func (s *GeminiService) GetRecommendations(ctx context.Context, mbti string, mood string) ([]model.MovieRecommendation, error) {
	// JSONスキーマに合わせたプロンプト
	prompt := fmt.Sprintf(`
あなたは映画ソムリエです。以下の条件に合う映画を3本選出してください。

ターゲット: %s型
今の気分: %s

出力フォーマットは以下のJSON配列のみを返してください。Markdown記法は不要です。
[
  {
    "title": "映画の邦題",
    "year": "公開年",
    "reason_ti": "Ti（内向的思考）を刺激するポイント（論理的整合性、構造美など）",
    "reason_ne": "Ne（外向的直感）を刺激するポイント（可能性、概念の拡張など）"
  }
]
`, mbti, mood)

	resp, err := s.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from gemini")
	}

	// JSONパース
	var movies []model.MovieRecommendation
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &movies); err != nil {
				return nil, fmt.Errorf("failed to parse json: %v", err)
			}
			break
		}
	}

	return movies, nil
}

func (s *GeminiService) Close() {
	s.client.Close()
}
