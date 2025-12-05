# TYPECAST

![TYPECAST Logo](./typecast-web/public/logo.png)

**MBTI Logic-Based Cinema Recommender**

「感情」ではなく「論理」で映画を選ぶ。  
TYPECASTは、MBTI（性格タイプ）の心理機能（Ti: 内向的思考、Ne: 外向的直感など）を刺激するかどうかを基準に、AIが映画をレコメンドするWebアプリケーションです。

(仮)URL: https://gen-lang-client-0402880164.web.app/

---

## 🚀 Concept

従来のレコメンドサービスは「泣ける」「感動する」といった感情的指標に基づいたものが主流でした。
しかし、論理学者型（INTP）などの分析的な性格タイプにとっては、「脚本の整合性」や「概念の拡張」、「思考実験としての面白さ」こそが重要です。

TYPECASTは、Google Gemini APIを活用し、ユーザーの「性格タイプ」と「今の気分」から、脳の特定の領域を刺激する映画を厳選して提案します。

## ✨ Features

### 1. Logic-Based Recommendation
* ユーザーのMBTIタイプと「今の気分（例：現実逃避したい、知恵熱が出そうな難解なやつ）」を入力。
* Gemini AIが、感情論を排除し「なぜその機能（Ti/Ne等）に刺さるのか」を論理的に解説。

### 2. Visual & Data Integration
* **TMDB API連携:** 映画のポスター画像、公開年を高解像度で表示。
* **Watch Providers:** 日本国内で視聴可能な動画配信サービス（Netflix, U-NEXT, Amazon Prime等）のアイコンを表示。
* **Direct Link:** アイコンクリックで視聴ページ（TMDB経由）へ遷移し、スムーズな視聴体験を提供。

### 3. Modern UI/UX
* React + Tailwind CSS によるダークモード・サイバーパンク調のUI。
* レスポンシブ対応（スマホ・PC）。

## 🛠 Tech Stack

**Frontend**
* TypeScript
* React (Vite)
* Tailwind CSS
* Lucide React (Icons)

**Backend**
* Go (Golang)
* Echo (Web Framework)

**AI & Data**
* Google Gemini API (gemini-2.0-flash / 1.5-flash)
* TMDB API (The Movie Database)

**Infrastructure & DevOps**
* Google Cloud Run (Backend Hosting)
* Firebase Hosting (Frontend Hosting)
* Docker
* GitHub Actions (CI/CD Pipeline)

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