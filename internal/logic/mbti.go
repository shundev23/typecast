package logic

import "strings"

type CognitiveFunctions struct {
	Main string
	Sub  string
	Desc string
}

var mbtiMap = map[string]CognitiveFunctions{
	"INTP": {"Ti", "Ne", "Ti(内向的思考) / Ne(外向的直感)"},
	"INTJ": {"Ni", "Te", "Ni(内向的直感) / Te(外向的思考)"},
	"ENTP": {"Ne", "Ti", "Ne(外向的直感) / Ti(内向的思考)"},
	"ENTJ": {"Te", "Ni", "Te(外向的思考) / Ni(内向的直感)"},
	"INFP": {"Fi", "Ne", "Fi(内向的感情) / Ne(外向的直感)"},
	"INFJ": {"Ni", "Fe", "Ni(内向的直感) / Fe(外向的感情)"},
	"ENFP": {"Ne", "Fi", "Ne(外向的直感) / Fi(内向的感情)"},
	"ENFJ": {"Fe", "Ni", "Fe(外向的感情) / Ni(内向的直感)"},
	"ISTP": {"Ti", "Se", "Ti(内向的思考) / Se(外向的感覚)"},
	"ISTJ": {"Si", "Te", "Si(内向的感覚) / Te(外向的思考)"},
	"ESTP": {"Se", "Ti", "Se(外向的感覚) / Ti(内向的思考)"},
	"ESTJ": {"Te", "Si", "Te(外向的思考) / Si(内向的感覚)"},
	"ISFP": {"Fi", "Se", "Fi(内向的感情) / Se(外向的感覚)"},
	"ISFJ": {"Si", "Fe", "Si(内向的感覚) / Fe(外向的感情)"},
	"ESFP": {"Se", "Fi", "Se(外向的感覚) / Fi(内向的感情)"},
	"ESFJ": {"Fe", "Si", "Fe(外向的感情) / Si(内向的感覚)"},
}

// タイプから機能を取得するヘルパー関数
func GetFunctions(mbti string) CognitiveFunctions {
	upper := strings.ToUpper(mbti)
	if val, ok := mbtiMap[upper]; ok{
		return  val
	}
	// デフォルト値はINTP
	return mbtiMap["INTP"]
}