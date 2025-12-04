# --- Build Stage ---
FROM golang:1.23-alpine AS builder

# 作業ディレクトリ設定
WORKDIR /app

# 依存関係ファイルのコピーとダウンロード
COPY go.mod go.sum ./
RUN go mod download

# ソースコードのコピー
COPY . .

# ビルド実行
# -o main: 出力ファイル名を main に
# ./cmd/api/main.go: エントリーポイントを指定
RUN go build -o main ./cmd/api/main.go

# --- Run Stage ---
# 実行用には軽量なalpineを使う
FROM alpine:latest

WORKDIR /app

# SSL証明書（API叩くのに必要）とタイムゾーン設定を入れる
RUN apk --no-cache add ca-certificates tzdata

# Builderステージからバイナリだけをコピー
COPY --from=builder /app/main .

# ポート公開（Cloud Runはデフォルト8080）
EXPOSE 8080

# 実行コマンド
CMD ["./main"]