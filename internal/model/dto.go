package model

type RecommendRequest struct {
	MBTI         string   `json:"mbti"`
	Mood         string   `json:"mood"`
	IgnoreMovies []string `json:"ignore_movies"`
}

// APIからのレスポンス
type RecommendResponse struct {
	Movies []MovieRecommendation `json:"movies"`
}

// 映画1本分のデータ
type MovieRecommendation struct {
	Title      string     `json:"title"`
	Year       string     `json:"year"`
	ReasonMain string     `json:"reason_main"`
	ReasonSub  string     `json:"reason_sub"`
	LabelMain  string     `json:"label_main"`
	LabelSub   string     `json:"label_sub"`
	Poster     string     `json:"poster"`
	Providers  []Provider `json:"providers"`
}

// 配信サイトの情報
type Provider struct {
	Name string `json:"name"`
	Logo string `json:"logo"`
	Link string `json:"link"`
}
