# TYPECAST

![TYPECAST Logo](./typecast-web/public/logo.png)

**MBTI Logic-Based Cinema Recommender**

「感情」ではなく「論理」で映画を選ぶ。  
TYPECASTは、MBTI（性格タイプ）の心理機能（Ti: 内向的思考、Ne: 外向的直感など）を刺激するかどうかを基準に、AIが映画をレコメンドするWebアプリケーションです。

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.23-00ADD8?style=flat-square&logo=go" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/Google_Cloud_Run-Deploy-4285F4?style=flat-square&logo=google-cloud" />
  <img src="https://img.shields.io/badge/AI-Gemini_2.0_Flash-8E75B2?style=flat-square&logo=google-gemini" />
</p>

(仮)URL: https://gen-lang-client-0402880164.web.app/

---

## 🚀 Concept

従来のレコメンドサービスは「泣ける」「感動する」といった感情的指標に基づいたものが主流でした。
しかし、論理学者型（INTP）などの分析的な性格タイプにとっては、「脚本の整合性」や「概念の拡張」、「思考実験としての面白さ」こそが重要です。

TYPECASTは、**Google Gemini API** を活用し、ユーザーの **MBTI（16タイプ）** と **今の気分** から、脳の特定の心理機能（Ti/Ne/Ni/Teなど）を刺激する映画を論理的に厳選して提案します。

## ✨ Features

### 1. Logic-Based Recommendation
* **16タイプ完全対応:** ユーザーのMBTIタイプに合わせて、Geminiへのプロンプトを動的に生成。
* **心理機能解説:** 「なぜこの映画が良いのか」を、各タイプの主機能（例: Ti）と補助機能（例: Ne）の観点から論理的にプレゼンします。

### 2. Visual & Data Integration
* **感情スコアリング:** 入力された気分のテキストをAIが分析し、ポジティブ/ネガティブ度を数値化（-5 〜 +5）。
* **Weekly Rhythm Analysis:** 過去の感情スコアを日別平均化し、チャートで可視化。
* **Gamification:** 正確なバイオリズムを算出するため、データが7日分（7日間）溜まるまではチャートがロックされる仕組みを搭載。

### 3. Smart History & Anti-Duplication
* **履歴保存:** 提案された映画は Firestore に自動保存。
* **被り防止機能:** 過去に提案済みの映画は次回のAIプロンプトで自動的に除外リストに追加。「使えば使うほど新しい映画に出会える」体験を提供します。

### 4. Rich Data Integration
* **Watch Providers:** TMDB APIと連携し、日本国内で視聴可能な配信サービス（Netflix, U-NEXT, Amazon Prime等）のアイコンを表示。
* **Direct Link:** アイコンクリックで視聴ページへ直接遷移。

### 5. Social Sharing
* 分析結果（MBTI、気分、スコア、処方された映画）をワンクリックで X (Twitter) にシェア可能。

## 🛠 Tech Stack

### Architecture
モノレポ構成を採用し、Frontend/Backendを一元管理しています。

| Category | Tech |
| --- | --- |
| **Frontend** | React (Vite), TypeScript, Tailwind CSS, Recharts, Lucide React |
| **Backend** | Go (Golang), Echo Framework |
| **AI / LLM** | Google Gemini API (gemini-2.0-flash / 1.5-flash) |
| **Data Source** | TMDB API (The Movie Database) |
| **Database** | Firebase Firestore (NoSQL) |
| **Auth** | Firebase Authentication (Google Login) |
| **Infrastructure** | Google Cloud Run (Backend), Firebase Hosting (Frontend) |
| **DevOps** | Docker, GitHub Actions (CI/CD) |

## 💻 Local Development

### Prerequisites
* Go 1.23+
* Node.js 20+
* Docker (Optional)

### Setup

1. Clone the repository
   ```bash
   git clone [https://github.com/your-username/typecast.git](https://github.com/your-username/typecast.git)
   cd typecast
   ```
2. Backend Setup Create .env file in root directory.
    ```bash
    PORT=8080
    GEMINI_API_KEY=your_gemini_key
    TMDB_API_KEY=your_tmdb_key
    ```
    Run Backend:
    ```bash
    go run cmd/api/main.go
    ```

3. Frontend Setup Move to web directory and create .env file.
    ```bash
    cd web
    ```
    Create src/firebase.ts with your config (or use .env):
    ```ts
    export const firebaseConfig = { ... };
    ```
    ```bash
    VITE_API_URL=http://localhost:8080/api/recommend
    ```
    Run Frontend:
    ```bash
    npm install
    npm run dev
    ```

### 📜 License
This project is licensed under the MIT License.