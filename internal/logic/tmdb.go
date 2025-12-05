package logic

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"typecast/internal/model"
)

type TmdbService struct {
	apiKey string
}

func NewTmdbService() *TmdbService {
	return &TmdbService{
		apiKey: os.Getenv("TMDB_API_KEY"),
	}
}

// TMDBの検索結果構造体（必要なものだけ定義）
type tmdbSearchResponse struct {
	Results []struct {
		ID         int    `json:"id"`
		PosterPath string `json:"poster_path"`
		Title      string `json:"title"`
	} `json:"results"`
}

// 配信情報の型
type tmdbProviderResponse struct {
	Results map[string]struct {
		Flatrate []struct {
			ProviderName string `json:"provider_name"`
			LogoPath     string `json:"logo_path"`
		} `json:"flatrate"`
	} `json:"results"`
}

func (s *TmdbService) GetMovieMetadata(movieTitle string) (string, []model.Provider) {
	if s.apiKey == "" {
		return "", nil
	}

	// --- Phase 1: タイトルで検索してIDとポスターを取得 ---
	searchEndpoint := "https://api.themoviedb.org/3/search/movie"
	u, _ := url.Parse(searchEndpoint)
	q := u.Query()
	q.Set("api_key", s.apiKey)
	q.Set("query", movieTitle)
	q.Set("language", "ja-JP")
	u.RawQuery = q.Encode()

	resp, err := http.Get(u.String())
	if err != nil {
		return "", nil
	}
	defer resp.Body.Close()

	var searchResult tmdbSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResult); err != nil {
		return "", nil
	}

	if len(searchResult.Results) == 0 {
		return "", nil
	}

	movie := searchResult.Results[0]
	posterURL := ""
	if movie.PosterPath != "" {
		posterURL = "https://image.tmdb.org/t/p/w500" + movie.PosterPath
	}

	// --- Phase 2: IDを使って配信情報を取得 ---
	// https://api.themoviedb.org/3/movie/{movie_id}/watch/providers
	providerEndpoint := fmt.Sprintf("https://api.themoviedb.org/3/movie/%d/watch/providers", movie.ID)
	u2, _ := url.Parse(providerEndpoint)
	q2 := u2.Query()
	q2.Set("api_key", s.apiKey)
	u2.RawQuery = q2.Encode()

	resp2, err := http.Get(u2.String())
	if err != nil {
		// 配信情報が取れなくてもポスターだけ返す
		log.Printf("[ERROR] TMDB Request Error: %v", err)
		return posterURL, nil
	}
	defer resp2.Body.Close()

	bodyBytes, _ := io.ReadAll(resp2.Body)
	log.Printf("[DEBUG] Movie: %s (ID:%d), Response: %s", movieTitle, movie.ID, string(bodyBytes))

	var providerResult tmdbProviderResponse
	if err := json.Unmarshal(bodyBytes, &providerResult); err != nil {
		log.Printf("JSON Parse Error: %v", err)
		return posterURL, nil
	}

	// ログでJPデータの中身を確認
	if jpData, ok := providerResult.Results["JP"]; ok {
		log.Printf("JP Data Found: Flatrate count=%d", len(jpData.Flatrate))
	} else {
		log.Printf("JP Data Not Found for movie %d", movie.ID)
	}

	// 日本 (JP) の見放題 (Flatrate) 情報だけ抽出
	var providers []model.Provider
	if jpData, ok := providerResult.Results["JP"]; ok {
		for _, p := range jpData.Flatrate {
			providers = append(providers, model.Provider{
				Name: p.ProviderName,
				Logo: "https://image.tmdb.org/t/p/original" + p.LogoPath,
			})
		}
	}

	return posterURL, providers
}

// マップのキー一覧を取得する補助関数（デバッグ用）
func getKeys(m map[string]struct {
	Flatrate []struct {
		ProviderName string `json:"provider_name"`
		LogoPath     string `json:"logo_path"`
	} `json:"flatrate"`
}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func (s *TmdbService) GetPosterURL(movieTitle string) string {
	if s.apiKey == "" {
		return ""
	}

	// 検索クエリの作成
	endpoint := "https://api.themoviedb.org/3/search/movie"
	u, _ := url.Parse(endpoint)
	q := u.Query()
	q.Set("api_key", s.apiKey)
	q.Set("query", movieTitle)
	q.Set("language", "ja-JP") // 日本語ポスターがあれば優先
	u.RawQuery = q.Encode()

	resp, err := http.Get(u.String())
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var result tmdbSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}

	if len(result.Results) > 0 && result.Results[0].PosterPath != "" {
		// 画像のベースURL + サイズ(w500) + パス
		return "https://image.tmdb.org/t/p/w500" + result.Results[0].PosterPath
	}

	return "" // 画像が見つからない場合
}
