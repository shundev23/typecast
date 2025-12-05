package model

type RecommendRequest struct {
	MBTI string `json:"mbti"`
	Mood string `json:"mood"`
}

// APIからのレスポンス
type RecommendResponse struct {
	Movies []MovieRecommendation `json:"movies"`
}

// 映画1本分のデータ
type MovieRecommendation struct {
	Title     string     `json:"title"`
	Year      string     `json:"year"`
	ReasonTi  string     `json:"reason_ti"`
	ReasonNe  string     `json:"reason_ne"`
	Poster    string     `json:"poster"`
	Providers []Provider `json:"providers"`
}

// 配信サイトの情報
type Provider struct {
	Name string `json:"name"`
	Logo string `json:"logo"`
	Link string `json:"link"`
}
