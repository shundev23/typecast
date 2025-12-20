package handler

import (
	"image/png"
	"strconv"
	"strings"
	"typecast/internal/logic"

	"github.com/labstack/echo/v4"
)

type OgpHandler struct {
	Service *logic.OgpService
}

func (h *OgpHandler) GenerateOgp(c echo.Context) error {
	score, _ := strconv.Atoi(c.QueryParam("score"))
	titles := strings.Split(c.QueryParam("titles"), ",")
	posters := strings.Split(c.QueryParam("posters"), ",")

	img, err := h.Service.GenerateImage(score, titles, posters)
	if err != nil {
		return c.String(500, "Failed to generate image")
	}

	c.Response().Header().Set(echo.HeaderContentType, "image/png")
	return png.Encode(c.Response().Writer, img)
}