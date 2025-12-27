package logic

import (
	"bytes"
	"fmt"
	"image/color"
	"image/png"
	"log"

	"github.com/fogleman/gg"
)

type OgpService struct {
    FontPath string
}

func NewOgpService() *OgpService {
    // 実行ファイルからの相対パス、または環境変数で指定
    // Dockerfileでの配置に合わせて調整が必要
    return &OgpService{
        FontPath: "assets/fonts/Bold.ttf",
    }
}

// GenerateImage は映画タイトル、ムード、スコアを受け取り、PNG画像のバイト列を返す
func (s *OgpService) GenerateImage(title string, mood string, score int) ([]byte, error) {
	// 1. キャンバスの作成 (X OGP推奨サイズ: 1200x630)
	const W, H = 1200, 630
	dc := gg.NewContext(W, H)

	// 2. 背景塗りつぶし (ダークなサイバーパンク色: #0f172a = RGB(15, 23, 42))
	dc.SetColor(color.RGBA{15, 23, 42, 255})
	dc.Clear()

	// --- デザイン装飾 (枠線など) ---
	// 枠線をCyan色に
	dc.SetColor(color.RGBA{34, 211, 238, 255}) 
	dc.SetLineWidth(20)
	dc.DrawRectangle(0, 0, float64(W), float64(H))
	dc.Stroke()

	// 3. フォント読み込み (タイトル用: 大きめ)
    // Cloud Runで動かす際はパスに注意が必要
	if err := dc.LoadFontFace(s.FontPath, 80); err != nil {
		log.Printf("Could not load font: %v", err)
        // フォントがない場合のフォールバックなどを検討してもよいが、一旦エラーにする
		return nil, err
	}

	// 4. 文字描画: タイトル (中央揃え)
	dc.SetColor(color.White)
    // 長いタイトルは折り返したいが、まずは単純に描画
	dc.DrawStringAnchored(title, W/2, H/2-50, 0.5, 0.5)

	// 5. 文字描画: スコア
    // フォントサイズ変更
	if err := dc.LoadFontFace(s.FontPath, 50); err == nil {
        scoreText := fmt.Sprintf("Sentiment Score: %d", score)
        dc.SetColor(color.RGBA{34, 211, 238, 255}) // Cyan
        dc.DrawStringAnchored(scoreText, W/2, H/2+100, 0.5, 0.5)
    }

    // 6. ムード (小さく表示)
    if err := dc.LoadFontFace(s.FontPath, 40); err == nil {
        // 長すぎる場合はカット
        displayMood := mood
        if len([]rune(mood)) > 20 {
            displayMood = string([]rune(mood)[:20]) + "..."
        }
        dc.SetColor(color.RGBA{200, 200, 200, 255})
        dc.DrawStringAnchored(fmt.Sprintf("Mood: %s", displayMood), W/2, H/2+180, 0.5, 0.5)
    }
    
	// 7. バッファに書き出し
	buf := new(bytes.Buffer)
	if err := png.Encode(buf, dc.Image()); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}