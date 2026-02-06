---
title: "MBTI×感情分析の映画レコメンド「TYPECAST」をGo×Cloud Runで作った話（動的OGP/Secrets運用まで）"
emoji: "🎬"
type: "tech"
topics: ["go", "react", "firebase", "cloudrun", "gemini"]
published: false
---

## はじめに

皆さんは「映画を観ようと思ってNetflixを開いたのに、作品を選んでいるうちに疲れて、結局YouTubeを見て寝る」みたいな経験ありませんか。私はあります。毎回あります。

「今の自分の気分」と「自分の性格（好み）」を理解して、**「これを観て。なぜなら君は今こういう状態だから」** と論理で説得してくれる存在が欲しい。
そんな思いから、**MBTI × 感情分析シネマレコメンドアプリ『TYPECAST』** を開発しました。

- **サービス**: `https://tycast.net/`
- **ざっくり**: MBTI（16タイプ）+ 今のMood（気分/悩み）を入力すると、AIが心理機能と心理状態を解釈して、映画を理由付きで3本すすめます

この記事では、現行のリポジトリ実装（Go/Echo + Cloud Run、React/Vite + Firebase Hosting、Firestore、Gemini、TMDB）に沿って、特にハマりやすい **「Geminiへの人格埋め込み（プロンプト設計）」** と **「SPAでの動的OGP」**、そして **Secrets/環境変数の扱い** を中心にまとめます。

## TYPECASTの特徴

- **理由付きレコメンド**
  - 「INTPは抽象概念の整合性や思考実験に快感を得やすい」など、MBTIの心理機能（主機能/補助機能）を根拠に説明します
- **感情分析（スコア化）**
  - Moodテキストを分析してスコア化し、1週間の推移をチャートで見られます
- **1日N回の利用制限（β運用）**
  - `DAILY_RECOMMEND_LIMIT`（デフォルト3）で制御
- **動的OGP（Xシェア用）**
  - 診断結果をシェアすると、映画タイトル/ムード/スコアが載ったOGP画像を動的生成します

## 全体アーキテクチャ（モノレポ）

このリポジトリはモノレポ構成で、フロント（`typecast-web`）とバックエンドAPI（Go）を同居させています。

- **Frontend**: React + Vite + TypeScript（Firebase Hosting）
- **Backend**: Go + Echo（Cloud Run）
- **Auth/DB**: Firebase Authentication / Firestore
- **AI**: Gemini API（`gemini-2.0-flash`）
- **Movie Data**: TMDB API
- **CI/CD**: GitHub Actions（Cloud Run / Firebase Hosting）

## 技術TIPS①：Geminiへの「人格」の埋め込み（＝プロンプトをコードに直書きしない）

映画を3本出すだけなら簡単ですが、TYPECASTの肝は **「MBTIに基づく納得感」** です。
そのため、Geminiには「心理学と映画理論に精通したコンシェルジュ」のような役割を与え、**JSONのみ** を返すように固定しています。

ポイントは2つです。

- **レスポンスをJSONに固定**（Go側でパースを安定させる）
- **プロンプトはリポジトリに置かず、環境変数で注入**（機密/調整頻度が高いので）

### JSON固定（ResponseMIMEType）

現行実装では、Geminiクライアント生成時に `ResponseMIMEType = "application/json"` を設定しています。
この一手間で「文章が混ざってJSONが壊れる」事故がかなり減ります。

### プロンプトは `GEMINI_PROMPT_TEMPLATE` で注入

TYPECASTでは、プロンプトを `GEMINI_PROMPT_TEMPLATE` に持たせています。

- **改行は `\n` を含む文字列**として注入し、Go側で `strings.ReplaceAll(template, "\\n", "\n")` で復元
- `fmt.Sprintf` のプレースホルダに **MBTI/心理機能/ムード/除外タイトル** を差し込み
- GitHub Actions（Cloud Run）やローカル `.env` で差し替え可能

この方式にすると、ハッカソン中に「プロンプトだけ素早く改善する」がやりやすく、かつリポジトリにプロンプト（=ノウハウ）を露出させずに済みます。

## 技術TIPS②：SPAで動的OGPを成立させる（Bot判定 + 画像生成）

ReactなどのSPAは、通常の `index.html` を返すだけだとXのクローラーがJSを実行せず、OGPが動きません。
そこでバックエンド（Go）側で **Bot判定** と **OGPメタタグHTML** を返し、画像は別エンドポイントで **PNG生成** します。

### 1) シェアの流れ（現行実装）

1. フロントでシェアボタン → `POST /api/share`（タイトル/ムード/スコア）  
2. バックエンドがFirestoreに保存し、短いID（UUID先頭8文字）を発行  
3. `share_url` として `GET /s/:id` のURLを返す  
4. XなどのBotが `GET /s/:id` にアクセス  
5. User-AgentがBotなら **OGPメタタグを含むHTML** を返す（`twitter:image` は `GET /api/ogp?...` を指す）  
6. 人間のブラウザならフロントへリダイレクト（`FRONTEND_URL?share_id=:id`）

### 2) Bot判定（User-Agent）

`twitterbot` / `slackbot-linkexpanding` など、主要なクローラー文字列を lower-case で含むかどうかで判定しています（簡易実装でも、ハッカソン用途なら十分戦えます）。

### 3) 画像生成（/api/ogp）

`GET /api/ogp?title=...&mood=...&score=...` でPNGを生成して返します。

画像生成は `fogleman/gg` を使用しています。GoでCanvasっぽく描けて便利です。

#### ハマりポイント：フォント/静的アセットはバイナリに含まれない

ローカルでは動くのにCloud Runで落ちる、あるあるの原因がこれです。
TYPECASTでは `assets/fonts/Bold.ttf` を読み込んでいるため、Dockerイメージ側に **assetsフォルダをコピー** しています。

Dockerfileはマルチステージで、実行イメージに `assets/` を同梱しています（ここが超重要）。

## 公開できない変数（Secrets）をどう扱うか

TYPECASTでは、以下を **GitHub Secrets** で管理し、デプロイ時に環境変数として注入しています。

- **Gemini/TMDBのAPIキー**
- **Firebase/Firestoreの接続情報（Project ID, DB名）**
- **FRONTEND_URL / API_BASE_URL**（OGPのリンク生成に必須）

### バックエンド（Cloud Run）の環境変数注入

GitHub Actions内で `gcloud run deploy ... --set-env-vars ...` しています。
ここで `FRONTEND_URL` と `API_BASE_URL` を明示するのが重要で、これが無いとシェアURLが `localhost` のままになります（実際にやらかしました）。

### フロントエンド（Vite）の環境変数

Viteはビルド時に `VITE_` プレフィックスの環境変数を埋め込むため、CIのビルドステップで `env:` に渡します。
本番用 `VITE_API_URL` を間違えると、フロントが本番でもローカルAPIを叩き始めます。ここはチェックリスト化が正義です。

## 小ネタ：β運用の「1日N回制限」

レコメンドはAPIコストが読みにくいので、βでは**日次上限**を置くのが安心です。
現行実装は `DAILY_RECOMMEND_LIMIT`（デフォルト3）で制御し、ユーザーごとに回数をカウントしています。

## 今後の展望

- **フィードバックを学習に活かす（RLHF的）**
  - 「見たことある」「好みじゃない」を蓄積し、プロンプトに反映して“専属コンシェルジュ”に育てたい
- **RAGの導入**
  - TMDB由来のベクトル検索 → Geminiへ根拠付きで渡して、幻覚を減らす
- **VOD連携の強化**
  - 「どこで観れる？」を完全に解決し、視聴までの導線を短くする

## まとめ

TYPECASTは、MBTI（心理機能）と今のMoodを入力にして、Geminiが**理由付き**で映画を提案するサービスです。

特に実装で効いたのは以下でした。

- プロンプトをコードに直書きせず、**環境変数テンプレート化**して高速に改善できるようにする
- SPAでもOGPを成立させるための **Bot判定 + OGPタグHTML + PNG動的生成**
- SecretsをGitHub Actionsから注入し、**本番URL（FRONTEND_URL/API_BASE_URL）を間違えない**運用に寄せる

もしよかったら触ってみてください。

`https://tycast.net/`

