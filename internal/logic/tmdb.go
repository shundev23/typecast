package logic

import (
	"encoding/json"
	"net/http"
	"net/url"
	"os"
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
		PosterPath string `json:"poster_path"`
		Title      string `json:"title"`
	} `json:"results"`
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
