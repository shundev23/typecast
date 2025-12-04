package model

type RecommendRequest struct {
	MBTI string `json:"mbti"`
	Mood string `json:"mood"`
}

// APIからのレスポンスを入れる箱
type RecommendResponse struct {
	Movies []MovieRecommendation `json:"movies"`
}

// 映画1本分のデータ構造
type MovieRecommendation struct {
	Title    string `json:"title"`
	Year     string `json:"year"`
	ReasonTi string `json:"reason_ti"`
	ReasonNe string `json:"reason_ne"`
	Poster   string `json:"poster"`
}
