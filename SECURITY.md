# セキュリティガイド

🌐 **[English version here](./SECURITY.en.md)**

このドキュメントでは、TYPECASTプロジェクトのセキュリティ設定について説明します。

## 概要

TYPECASTは以下のセキュリティ対策を実装しています：

1. **環境変数による機密情報の管理**
2. **Firestore Security Rulesによるデータアクセス制御**
3. **Firebase API Keyの制限設定（推奨）**
4. **GitHub Secretsによる本番環境の保護**

---

## 1. 環境変数の管理

### 機密情報の保護

以下のファイルは`.gitignore`で除外され、Gitリポジトリには含まれません：

- `.env` - ローカル開発用の環境変数
- `.env.local` - ローカル環境固有の設定
- `service-account.json` - GCPサービスアカウント鍵
- `.cursorrules` - Cursor IDE設定

### 必須環境変数

#### バックエンド（ルートディレクトリの`.env`）

```bash
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
VITE_FIREBASE_PROJECT_ID=your-project-id
FIRESTORE_DB_NAME=(default)
GEMINI_PROMPT_TEMPLATE_B64=base64_encoded_prompt
DAILY_RECOMMEND_LIMIT=5
ACCOUNT_RECREATE_COOLDOWN_HOURS=24
```

#### フロントエンド（`typecast-web/.env`）

```bash
VITE_API_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**重要**: `firebase.ts`はハードコードされたフォールバック値を持たないため、全ての環境変数が必須です。未設定の場合は起動時にエラーが発生します。

---

## 2. Firestore Security Rules

### ルールの概要

`firestore.rules`ファイルで以下のアクセス制御を実装しています：

#### users コレクション
- 読み取り・書き込み：自分のドキュメントのみ

#### history コレクション
- 読み取り・書き込み：自分の履歴のみ
- `user_id`フィールドで所有者を判定

#### share コレクション
- 読み取り：誰でも可能（シェアリンク用）
- 作成・更新・削除：自分が作成したもののみ

#### feedback コレクション
- 読み取り・書き込み：自分のフィードバックのみ

#### deleted_identities コレクション
- 読み取り・書き込み：不可（サーバーサイドのみ）

### ルールのデプロイ

```bash
# Firestore Rulesのみデプロイ
firebase deploy --only firestore:rules

# 全体をデプロイ（Hosting + Firestore Rules）
firebase deploy
```

### ルールのテスト

Firebase Consoleの「Firestore Database > ルール」タブで、ルールシミュレーターを使用してテストできます。

---

## 3. Firebase API Key制限（推奨）

Firebase Web API Keyは公開されることが前提ですが、不正利用を防ぐため制限を設定することを強く推奨します。

### 設定手順

1. **GCP Consoleにアクセス**
   - https://console.cloud.google.com/
   - プロジェクトを選択

2. **認証情報ページを開く**
   - 左メニュー > APIs & Services > Credentials

3. **Firebase Web API Keyを選択**
   - API キーの一覧から`VITE_FIREBASE_API_KEY`に対応するキーを選択

4. **アプリケーションの制限を設定**
   - 「HTTPリファラー（ウェブサイト）」を選択
   - 以下のリファラーを追加：
     ```
     https://tycast.net/*
     https://*.tycast.net/*
     https://*.firebaseapp.com/*
     http://localhost:*/*
     ```

5. **API制限を設定**
   - 「キーを制限」を選択
   - 以下のAPIを有効化：
     - Identity Toolkit API
     - Token Service API
     - Cloud Firestore API
     - Firebase Installations API

6. **保存**

### 制限の効果

- 指定したドメイン以外からのAPIキー使用を防止
- 不正なFirebase操作をブロック
- クォータの不正消費を防止

---

## 4. GitHub Secretsの設定

本番環境へのデプロイには、以下のGitHub Secretsが必要です：

### 共通

- `GCP_PROJECT_ID` - GCPプロジェクトID
- `GCP_SA_KEY` - サービスアカウントのJSON鍵（全体）

### バックエンド（Cloud Run）

- `GEMINI_API_KEY` - Gemini APIキー
- `TMDB_API_KEY` - TMDB APIキー
- `GEMINI_PROMPT_TEMPLATE_B64` - Base64エンコードされたプロンプト
- `VITE_FIREBASE_PROJECT_ID` - FirebaseプロジェクトID
- `FIRESTORE_DB_NAME` - Firestoreデータベース名
- `PROD_FRONTEND_URL` - フロントエンドURL（例: https://tycast.net）
- `PROD_API_BASE_URL` - バックエンドURL（例: https://typecast-api-xxx.run.app）
- `DAILY_RECOMMEND_LIMIT` - 1日のレコメンド上限

### フロントエンド（Firebase Hosting）

- `VITE_API_URL` - バックエンドAPIのURL
- `VITE_FIREBASE_API_KEY` - Firebase Web APIキー
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase認証ドメイン
- `VITE_FIREBASE_PROJECT_ID` - FirebaseプロジェクトID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebaseストレージバケット
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging送信者ID
- `VITE_FIREBASE_APP_ID` - Firebase App ID

---

## 5. セキュリティチェックリスト

本番環境にデプロイする前に、以下を確認してください：

### 必須

- [ ] `.env`ファイルがGitリポジトリに含まれていない
- [ ] `service-account.json`がGitリポジトリに含まれていない
- [ ] Firestore Security Rulesがデプロイされている
- [ ] GitHub Secretsが全て設定されている
- [ ] Firebase Authenticationで承認済みドメインが設定されている

### 推奨

- [ ] Firebase API Keyに制限が設定されている
- [ ] Cloud Runサービスに適切なIAM権限が設定されている
- [ ] Firestoreのバックアップが有効化されている
- [ ] Cloud Loggingでエラー監視が設定されている

---

## 6. インシデント対応

### APIキーが漏洩した場合

1. **即座にキーを無効化**
   - GCP Console > APIs & Services > Credentials
   - 該当するキーを削除または再生成

2. **新しいキーを生成**
   - 新しいAPIキーを作成
   - 制限を設定

3. **環境変数を更新**
   - ローカル: `.env`ファイルを更新
   - 本番: GitHub Secretsを更新
   - Cloud Runを再デプロイ

4. **影響範囲を調査**
   - Cloud Loggingで不正なアクセスを確認
   - 必要に応じてユーザーに通知

### 不正アクセスを検知した場合

1. **Firestore Security Rulesを確認**
   - ルールが正しく設定されているか確認
   - 必要に応じて厳格化

2. **Cloud Loggingで調査**
   - 不正なアクセスパターンを特定
   - IPアドレスやユーザーIDを記録

3. **対策を実施**
   - 該当ユーザーのアカウントを停止
   - 必要に応じてAPIキー制限を強化

---

## 7. 参考リンク

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [GCP API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)

---

## 質問・問題報告

セキュリティに関する質問や問題を発見した場合は、公開のIssueではなく、プロジェクトメンテナーに直接連絡してください。
