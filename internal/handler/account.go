package handler

import (
	"context"
	"log"
	"net/http"

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
	uid, ok := c.Get("uid").(string)
	if !ok || uid == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}
	ctx := c.Request().Context()

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
	authClient, err := h.FirebaseApp.Auth(ctx)
	if err != nil {
		log.Printf("[Account] error=auth_client uid=%s err=%v", uid, err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to init auth client"})
	}
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

