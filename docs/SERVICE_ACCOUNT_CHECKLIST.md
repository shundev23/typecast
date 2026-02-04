# サービスアカウント確認チェックリスト

CI/CD（GitHub Actions）で使うサービスアカウント（`GCP_SA_KEY`）に、以下の権限があるか GCP コンソールで確認してください。

## 前提

- **Backend** と **Frontend** のワークフローはどちらも `secrets.GCP_SA_KEY` を利用しています。
- 1 つのサービスアカウントで両方のデプロイを行う想定です。

---

## 1. サービスアカウントの特定

1. [Google Cloud Console](https://console.cloud.google.com/) を開く。
2. 上部のプロジェクト選択で、**復元したプロジェクト**（`GCP_PROJECT_ID` と一致するもの）を選択。
3. 左メニュー **IAM と管理** → **サービスアカウント** を開く。
4. GitHub Actions 用に作成したサービスアカウント（例: `github-actions@xxx.iam.gserviceaccount.com`）を探す。
   - 不明な場合: GitHub の **Settings → Secrets and variables → Actions** で `GCP_SA_KEY` に設定した JSON を開き、`client_email` の値を確認。

---

## 2. 必要なロール（権限）の確認

対象のサービスアカウントの行をクリック → **「権限」タブ** で、次のロールが付与されているか確認する。

### バックエンド（Cloud Run + Artifact Registry）用

| ロール（日本語名）           | ロール ID                         | 用途                 |
|-----------------------------|------------------------------------|----------------------|
| Artifact Registry ライター | `roles/artifactregistry.writer`   | Docker イメージの push |
| Cloud Run 管理者            | `roles/run.admin`                 | Cloud Run へのデプロイ |
| サービス利用者              | `roles/serviceusage.serviceUsageConsumer` | 403 回避（API 利用許可） |

### フロントエンド（Firebase Hosting）用

| ロール（日本語名）     | ロール ID                       | 用途                 |
|------------------------|----------------------------------|----------------------|
| Firebase Hosting 管理者 | `roles/firebasehosting.admin`   | Hosting へのデプロイ |

### まとめて付与したい場合

- **編集者**（`roles/editor`）を付与すると、上記の多くをカバーできますが、権限が広くなります。
- 最小限にする場合は、上記 4 ロールを個別に付与してください。

---

## 3. ロールの付与手順（不足している場合）

1. **IAM と管理** → **IAM** を開く。
2. 一覧で対象の **サービスアカウント**（`xxx@xxx.iam.gserviceaccount.com`）の行を探す。
3. 右端の **編集（鉛筆アイコン）** をクリック。
4. **「別のロールを追加」** から、上記のロールを 1 つずつ追加。
5. **保存** する。
6. 反映に 1〜2 分かかることがあるため、すぐに CI を再実行する場合は少し待ってから **Re-run** する。

---

## 4. 鍵（キー）の確認

- プロジェクト削除・復元後は、**既存の JSON 鍵が無効になっている**ことがあります。
- CI で 403 や認証エラーが出る場合:
  1. **サービスアカウント** → 対象アカウント → **「キー」タブ**
  2. **「鍵を追加」** → **「新しい鍵を作成」** → **JSON** を選択して作成。
  3. ダウンロードした JSON の内容を、GitHub の **GCP_SA_KEY** シークレットに**丸ごと**上書き保存。
  4. 古い鍵は **削除** してよい（セキュリティのため推奨）。

---

## 5. 確認後の動作テスト

- **Backend**: main に push するか、Actions から「Deploy Backend to Cloud Run」を **Re-run**。
- **Frontend**: 「Deploy Frontend to Firebase Hosting」を **Re-run**。
- どちらも緑で完了すれば、サービスアカウントの設定は問題ありません。
