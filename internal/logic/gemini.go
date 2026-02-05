package logic

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"typecast/internal/model"

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

	// レスポンスをJSONに固定する設定
	geminiModel.ResponseMIMEType = "application/json"

	return &GeminiService{
		client: client,
		model:  geminiModel,
	}, nil
}

func (s *GeminiService) GetRecommendations(ctx context.Context, mbti string, mood string, ignoreMovies []string) (model.RecommendResponse, error) {
	// 心理機能を取得
	funcs := GetFunctions(mbti)

	// 除外リストの作成
	ignoreStr := ""
	if len(ignoreMovies) > 0 {
		for i, title := range ignoreMovies {
			if i > 0 {
				ignoreStr += ", "
			}
			ignoreStr += title
		}
	}

	// プロンプトは環境変数でのみ保持。リポジトリには含めない。
	// 互換性のため:
	// - まず GEMINI_PROMPT_TEMPLATE を見る（ローカル .env 用）
	// - 無ければ GEMINI_PROMPT_TEMPLATE_B64 を base64 デコードして使う（本番 / CI 用）
	// プレースホルダ順: mbti, Main, Sub, mood, ignoreStr, Main, Sub。改行は \n で渡す。
	template := os.Getenv("GEMINI_PROMPT_TEMPLATE")
	if template == "" {
		b64 := os.Getenv("GEMINI_PROMPT_TEMPLATE_B64")
		if b64 == "" {
			return model.RecommendResponse{}, fmt.Errorf("GEMINI_PROMPT_TEMPLATE or GEMINI_PROMPT_TEMPLATE_B64 is not set")
		}
		decoded, err := base64.StdEncoding.DecodeString(b64)
		if err != nil {
			return model.RecommendResponse{}, fmt.Errorf("failed to decode GEMINI_PROMPT_TEMPLATE_B64: %w", err)
		}
		template = string(decoded)
	}
	template = strings.ReplaceAll(template, "\\n", "\n")
	prompt := fmt.Sprintf(template, mbti, funcs.Main, funcs.Sub, mood, ignoreStr, funcs.Main, funcs.Sub)

	log.Printf("[Gemini] generate_content mbti=%s", mbti)
	resp, err := s.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		log.Printf("[Gemini] error=api_failed err=%v", err)
		return model.RecommendResponse{}, err
	}

	if len(resp.Candidates) == 0 {
		log.Printf("[Gemini] error=no_candidates")
		return model.RecommendResponse{}, fmt.Errorf("no response from gemini: no candidates")
	}
	if len(resp.Candidates[0].Content.Parts) == 0 {
		log.Printf("[Gemini] error=no_parts finish_reason=%v", resp.Candidates[0].FinishReason)
		return model.RecommendResponse{}, fmt.Errorf("no response from gemini: empty parts")
	}

	// JSONパース
	var response model.RecommendResponse
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &response); err != nil {
				preview := string(txt)
				if len(preview) > 300 {
					preview = preview[:300] + "..."
				}
				log.Printf("[Gemini] error=parse_json err=%v response_preview=%s", err, preview)
				return model.RecommendResponse{}, fmt.Errorf("failed to parse json: %w", err)
			}
			break
		}
	}

	// ラベル付与
	for i := range response.Movies {
		response.Movies[i].LabelMain = fmt.Sprintf("%s (主機能)", funcs.Main)
		response.Movies[i].LabelSub = fmt.Sprintf("%s (補助機能)", funcs.Sub)
	}

	return response, nil
}

func (s *GeminiService) Close() {
	s.client.Close()
}
