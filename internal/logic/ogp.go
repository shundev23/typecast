package logic

import (
	"image"
	"image/color"
	_ "image/jpeg"
	_ "image/png"

	"github.com/fogleman/gg"
)

type OgpService struct {
	FontPath string
}

func NewOgpService() *OgpService {
	return &OgpService{
		FontPath: "assets/fonts/NotoSansJP-Bold.ttf",
	}
}

func (s *OgpService) GenerateImage(score int, movieTitles []string, posterURLs []string) (image.Image, error) {
	const W, H = 1200, 630
	dc := gg.NewContext(W, H)
	dc.SetHexColor("#030712")
	dc.Clear()
	dc.SetColor(color.White)
	dc.DrawString("TYPECAST OGP", W/2, H/2)
	
	return dc.Image(), nil
}