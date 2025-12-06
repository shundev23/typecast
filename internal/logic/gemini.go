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

func (s *GeminiService) GetRecommendations(ctx context.Context, mbti string, mood string, ignoreMovies[]string) ([]model.MovieRecommendation, error) {
	// 心理機能を取得
	funcs := GetFunctions(mbti)
	
	// 除外リストの作成
	ignoreStr := ""
	if len(ignoreMovies) > 0{
		for i, title := range ignoreMovies{
			if i > 0{
				ignoreStr += ", "
			}
			ignoreStr += title
		}
	}
	
	// JSONスキーマに合わせたプロンプト
	prompt := fmt.Sprintf(`
	あなたはMBTIの専門家かつ映画ソムリエです。
	以下のユーザー属性に合わせて、映画を3本推薦してください。

	ターゲット: %s型
	心理機能: 主機能[%s], 補助機能[%s]
	今の気分: %s

	【重要：除外リスト】
	以下の映画は提案済みなので、今回は**絶対に**選ばないでください。
	除外対象: [%s]

	【出力ルール】
	1. 感情論（泣ける等）ではなく、指定された心理機能がいかに刺激されるかを解説すること。
	2. 出力は以下のJSON配列のみ。

	[
	{
	"title": "邦題",
	"year": "公開年",
    "reason_main": "%s（主機能）を刺激するポイント。なぜこの機能が納得・共鳴するのか。",
    "reason_sub": "%s（補助機能）を刺激するポイント。なぜこの機能がワクワク・反応するのか。"
	}
	]
	`, mbti, funcs.Main, funcs.Sub, mood, ignoreStr, funcs.Main, funcs.Sub)

	fmt.Println("--- GEMINI PROMPT START ---")
	fmt.Println(prompt)
	fmt.Println("--- GEMINI PROMPT END ---")

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

	for i := range movies{
		movies[i].LabelMain = fmt.Sprintf("%s（主機能）", funcs.Main)
		movies[i].LabelSub = fmt.Sprintf("%s（補助機能）", funcs.Sub)
	}

	return movies, nil
}

func (s *GeminiService) Close() {
	s.client.Close()
}
