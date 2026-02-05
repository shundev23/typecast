package security

import (
	"crypto/sha256"
	"encoding/hex"
)

// DeletedIdentityDocID は、プロバイダIDとプロバイダUIDから安定したFirestore DocIDを生成する。
// DocIDに "/" などが混ざる事故を避けるため、sha256(hex) にしている。
func DeletedIdentityDocID(providerID, providerUID string) string {
	sum := sha256.Sum256([]byte(providerID + ":" + providerUID))
	return hex.EncodeToString(sum[:])
}

// ExtractPrimaryIdentity は、Firebase ID Token の claims から
// (providerID, providerUID) を推定して返す。
//
// 典型的には:
// - claims["firebase"]["sign_in_provider"] が "google.com"
// - claims["firebase"]["identities"]["google.com"] が ["<providerUID>"]
func ExtractPrimaryIdentity(claims map[string]any) (string, string) {
	fb, ok := claims["firebase"].(map[string]any)
	if !ok {
		return "", ""
	}

	providerID, _ := fb["sign_in_provider"].(string)

	identities, ok := fb["identities"].(map[string]any)
	if !ok || len(identities) == 0 {
		return providerID, ""
	}

	// providerID が取れているならそれを優先
	if providerID != "" {
		if v, ok := identities[providerID]; ok {
			if uid := firstString(v); uid != "" {
				return providerID, uid
			}
		}
	}

	// フォールバック: identities の最初のキーを使う
	for k, v := range identities {
		if uid := firstString(v); uid != "" {
			return k, uid
		}
	}

	return providerID, ""
}

func firstString(v any) string {
	switch vv := v.(type) {
	case []any:
		if len(vv) == 0 {
			return ""
		}
		s, _ := vv[0].(string)
		return s
	case []string:
		if len(vv) == 0 {
			return ""
		}
		return vv[0]
	default:
		return ""
	}
}
