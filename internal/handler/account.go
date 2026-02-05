package handler

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"typecast/internal/security"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/labstack/echo/v4"
	"google.golang.org/api/iterator"
)

type AccountHandler struct {
	FirebaseApp *firebase.App
	Firestore   *firestore.Client
}

func NewAccountHandler(app *firebase.App, fs *firestore.Client) *AccountHandler {
	return &AccountHandler{
		FirebaseApp: app,
		Firestore:   fs,
	}
}

func (h *AccountHandler) DeleteAccount(c echo.Context) error {
	// クライアント側で「DELETE」と入力させるセーフティ。大文字小文字は区別し、完全一致を要求。
	var req struct {
		Confirm string `json:"confirm"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request"})
	}
	if strings.TrimSpace(req.Confirm) != "DELETE" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Confirmation text mismatch"})
	}

	uid, ok := c.Get("uid").(string)
	if !ok || uid == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}
	ctx := c.Request().Context()

	// 0) リセマラ対策: 削除前に「同一プロバイダID」をFirestoreへtombstoneとして残す
	//    これにより、削除→即再ログインしてもAPI利用をブロックできる。
	authClient, err := h.FirebaseApp.Auth(ctx)
	if err != nil {
		log.Printf("[Account] error=auth_client uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to init auth client"})
	}

	userRecord, err := authClient.GetUser(ctx, uid)
	if err != nil {
		log.Printf("[Account] error=get_user uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load auth user"})
	}

	cooldownHours := 24
	if v := os.Getenv("ACCOUNT_RECREATE_COOLDOWN_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cooldownHours = n
		}
	}
	now := time.Now()
	cooldownUntil := now.Add(time.Duration(cooldownHours) * time.Hour)

	for _, p := range userRecord.ProviderUserInfo {
		if p.ProviderID == "" || p.UID == "" {
			continue
		}
		docID := security.DeletedIdentityDocID(p.ProviderID, p.UID)
		_, err := h.Firestore.Collection("deleted_identities").Doc(docID).Set(ctx, map[string]any{
			"provider_id":     p.ProviderID,
			"provider_uid":    p.UID,
			"email":           userRecord.Email,
			"deleted_uid":     uid,
			"deleted_at":      now,
			"cooldown_until":  cooldownUntil,
			"block_forever":   false,
			"cooldown_hours":  cooldownHours,
			"last_updated_at": now,
		}, firestore.MergeAll)
		if err != nil {
			log.Printf("[Account] error=write_tombstone uid=%s provider=%s err=%v", uid, p.ProviderID, err)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to write deletion record"})
		}
	}

	// 1) Firestoreデータ削除（サブコレクションは自動削除されないため明示的に消す）
	userDoc := h.Firestore.Collection("users").Doc(uid)
	if err := deleteAllDocsInCollection(ctx, h.Firestore, userDoc.Collection("history")); err != nil {
		log.Printf("[Account] error=delete_history uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete history"})
	}
	if err := deleteAllDocsInCollection(ctx, h.Firestore, userDoc.Collection("feedbacks")); err != nil {
		log.Printf("[Account] error=delete_feedbacks uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete feedbacks"})
	}
	// users/{uid} 本体（利用制限カウント等）
	if _, err := userDoc.Delete(ctx); err != nil {
		log.Printf("[Account] error=delete_user_doc uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete user document"})
	}

	// 2) Firebase Authユーザー削除（Admin SDK）
	if err := authClient.DeleteUser(ctx, uid); err != nil {
		log.Printf("[Account] error=delete_auth_user uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete auth user"})
	}

	return c.JSON(http.StatusOK, map[string]any{"status": "success"})
}

// deleteAllDocsInCollection: コレクション配下のドキュメントを全削除（500件制限を避けて分割）
func deleteAllDocsInCollection(ctx context.Context, client *firestore.Client, col *firestore.CollectionRef) error {
	const batchSize = 400

	for {
		iter := col.Limit(batchSize).Documents(ctx)
		var refs []*firestore.DocumentRef
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return err
			}
			refs = append(refs, doc.Ref)
		}

		if len(refs) == 0 {
			return nil
		}

		batch := client.Batch()
		for _, r := range refs {
			batch.Delete(r)
		}
		if _, err := batch.Commit(ctx); err != nil {
			return err
		}
	}
}
