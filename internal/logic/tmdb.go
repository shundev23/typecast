package logic

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
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
		Link     string `json:"link"`
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
		return posterURL, nil
	}
	defer resp2.Body.Close()

	bodyBytes, _ := io.ReadAll(resp2.Body)

	var providerResult tmdbProviderResponse
	if err := json.Unmarshal(bodyBytes, &providerResult); err != nil {
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
		fmt.Printf("[DEBUG] TMDB Link found for %s: %s\n", movieTitle, jpData.Link)
		for _, p := range jpData.Flatrate {
			generatedLink := generateProviderLink(p.ProviderName, movieTitle)
			log.Printf("[TMDB] Provider: %s, Generated Link: %s", p.ProviderName, generatedLink)
			providers = append(providers, model.Provider{
				Name: p.ProviderName,
				Logo: "https://image.tmdb.org/t/p/original" + p.LogoPath,
				Link: generatedLink,
			})
		}
	}

	return posterURL, providers
}

// generateProviderLink は配信サービス名と映画タイトルから検索URLを生成
// 各配信サービスの検索ページへの直接リンクを返す
func generateProviderLink(providerName, movieTitle string) string {
	encodedTitle := url.QueryEscape(movieTitle)

	// プロバイダー名の正規化（大文字小文字、スペースの違いを吸収）
	normalizedName := strings.ToLower(strings.TrimSpace(providerName))

	switch {
	case strings.Contains(normalizedName, "netflix"):
		// Netflixの検索ページ
		return fmt.Sprintf("https://www.netflix.com/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "amazon") || strings.Contains(normalizedName, "prime"):
		// Amazon Prime Videoの検索ページ
		return fmt.Sprintf("https://www.amazon.co.jp/s?k=%s&i=instant-video", encodedTitle)

	case strings.Contains(normalizedName, "u-next"):
		// U-NEXTの検索ページ
		return fmt.Sprintf("https://video.unext.jp/search?query=%s", encodedTitle)

	case strings.Contains(normalizedName, "hulu"):
		// Huluの検索ページ
		return fmt.Sprintf("https://www.hulu.jp/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "disney"):
		// Disney+の検索ページ
		return fmt.Sprintf("https://www.disneyplus.com/ja-jp/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "dazn"):
		// DAZNの検索ページ
		return fmt.Sprintf("https://www.dazn.com/ja-JP/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "abema"):
		// ABEMAの検索ページ
		return fmt.Sprintf("https://abema.tv/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "lemino"):
		// Leminoの検索ページ
		return fmt.Sprintf("https://lemino.docomo.ne.jp/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "wowow"):
		// WOWOWオンデマンドの検索ページ
		return fmt.Sprintf("https://www.wowow.co.jp/search/?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "paravi"):
		// Paraviの検索ページ（現在はU-NEXTに統合されているが、念のため残す）
		return fmt.Sprintf("https://www.paravi.jp/search?query=%s", encodedTitle)

	case strings.Contains(normalizedName, "fod"):
		// FODの検索ページ
		return fmt.Sprintf("https://fod.fujitv.co.jp/search/?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "telasa"):
		// TELASAの検索ページ
		return fmt.Sprintf("https://www.telasa.jp/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "crankin"):
		// クランクイン!ビデオの検索ページ
		return fmt.Sprintf("https://www.crank-in.net/search?q=%s", encodedTitle)

	case strings.Contains(normalizedName, "tsutaya"):
		// TSUTAYA DISCASの検索ページ
		return fmt.Sprintf("https://movie-tsutaya.tsite.jp/netdvd/dvd/search.do?keyword=%s", encodedTitle)

	default:
		// 不明なプロバイダーの場合はGoogle検索にフォールバック
		searchQuery := url.QueryEscape(fmt.Sprintf("%s %s 視聴", providerName, movieTitle))
		return fmt.Sprintf("https://www.google.com/search?q=%s", searchQuery)
	}
}
