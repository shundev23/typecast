# TYPECASTへの貢献

🌐 **[English version here](./CONTRIBUTING.md)**

TYPECASTへの貢献に興味を持っていただきありがとうございます！このドキュメントでは、プロジェクトへの貢献ガイドラインを提供します。

## 目次

- [行動規範](#行動規範)
- [はじめに](#はじめに)
- [開発ワークフロー](#開発ワークフロー)
- [コーディング規約](#コーディング規約)
- [コミットガイドライン](#コミットガイドライン)
- [プルリクエストプロセス](#プルリクエストプロセス)
- [問題の報告](#問題の報告)

---

## 行動規範

### 私たちの約束

経験レベル、バックグラウンド、アイデンティティに関係なく、すべての貢献者に対して歓迎的で包括的な環境を提供することを約束します。

### 期待される行動

- すべてのやり取りにおいて敬意と配慮を持つ
- 建設的なフィードバックを提供する
- プロジェクトとコミュニティにとって最善のことに焦点を当てる
- 他の貢献者に対して共感を示す

### 容認されない行動

- ハラスメント、差別、または攻撃的なコメント
- 個人攻撃や荒らし行為
- 許可なく他者の個人情報を公開すること
- 専門的な場で不適切とされる行為

---

## はじめに

### 前提条件

貢献する前に、以下を確認してください：

- Go 1.25以上
- Node.js 20以上
- Git
- GitHubアカウント
- React、TypeScript、Goの基本知識

### 開発環境のセットアップ

1. **リポジトリをフォーク**
   - GitHubリポジトリページの「Fork」ボタンをクリック

2. **フォークをクローン**
   ```bash
   git clone https://github.com/YOUR_USERNAME/typecast.git
   cd typecast
   ```

3. **upstreamリモートを追加**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/typecast.git
   ```

4. **開発環境をセットアップ**
   - [README.ja.md](./README.ja.md)の手順に従ってバックエンドとフロントエンドをセットアップ

5. **新しいブランチを作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 開発ワークフロー

### 1. upstreamと同期

作業を開始する前に、フォークをupstreamリポジトリと同期します：

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### 2. フィーチャーブランチを作成

```bash
git checkout -b feature/your-feature-name
```

ブランチ命名規則：
- `feature/` - 新機能
- `fix/` - バグ修正
- `docs/` - ドキュメント更新
- `refactor/` - コードリファクタリング
- `test/` - テストの追加または変更

### 3. 変更を加える

- クリーンで保守可能なコードを書く
- コーディング規約に従う（下記参照）
- 新機能にはテストを追加する
- 必要に応じてドキュメントを更新する

### 4. 変更をテスト

#### バックエンドテスト
```bash
go test ./...
```

#### フロントエンドテスト
```bash
cd typecast-web
npm run lint
npm run build
```

#### 手動テスト
- バックエンドとフロントエンドの両方を起動してローカルでテスト
- 影響を受けるすべての機能が正しく動作することを確認

### 5. 変更をコミット

コミットガイドラインに従います（下記参照）：

```bash
git add .
git commit -m "feat: 新機能の説明"
```

### 6. フォークにプッシュ

```bash
git push origin feature/your-feature-name
```

### 7. プルリクエストを作成

- GitHubでフォークにアクセス
- 「New Pull Request」をクリック
- PRテンプレートに記入
- レビューを待つ

---

## コーディング規約

### Go（バックエンド）

- [Effective Go](https://golang.org/doc/effective_go.html)ガイドラインに従う
- `gofmt`でコードをフォーマット
- すべてのエラーを明示的に処理（`err`の無視禁止）
- 意味のある変数名と関数名を使用
- エクスポートされた関数と複雑なロジックにはコメントを追加
- 関数は小さく、焦点を絞る

例：
```go
// GetUserHistory はユーザーの推薦履歴を取得します
func GetUserHistory(ctx context.Context, userID string) ([]History, error) {
    if userID == "" {
        return nil, fmt.Errorf("userID cannot be empty")
    }
    
    // 実装...
    
    return history, nil
}
```

### TypeScript/React（フロントエンド）

- すべての新しいコードでTypeScriptを使用
- `any`型を避け、適切な型定義を使用
- Hooksを使った関数コンポーネントを使用
- Reactのベストプラクティスに従う
- 意味のあるコンポーネント名と変数名を使用
- コンポーネントは小さく、再利用可能に保つ

例：
```typescript
interface MovieCardProps {
  title: string;
  posterUrl: string;
  onSelect: (movieId: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  title, 
  posterUrl, 
  onSelect 
}) => {
  return (
    <div onClick={() => onSelect(title)}>
      <img src={posterUrl} alt={title} />
      <h3>{title}</h3>
    </div>
  );
};
```

### 一般的なガイドライン

- 自己文書化されたコードを書く
- 複雑なロジックにはコメントを追加
- 可能な限りファイルを500行以下に保つ
- 一貫した命名規則を使用
- 未使用のインポートと変数を削除
- 深いネストを避ける（最大3-4レベル）

---

## コミットガイドライン

[Conventional Commits](https://www.conventionalcommits.org/)仕様に従います。

### コミットメッセージフォーマット

```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル変更（フォーマット、ロジック変更なし）
- `refactor`: コードリファクタリング
- `test`: テストの追加または更新
- `chore`: メンテナンスタスク（依存関係、ビルドなど）
- `perf`: パフォーマンス改善

### 例

```bash
feat(recommend): MBTIベースの映画フィルタリングを追加

ユーザーの認知的嗜好に合う映画を推薦するため、MBTI心理機能を
使用したフィルタリングロジックを実装。

Closes #123
```

```bash
fix(auth): トークン有効期限の問題を解決

期限切れトークンが適切に更新されず、ユーザーが予期せず
ログアウトされるバグを修正。

Fixes #456
```

```bash
docs(readme): インストール手順を更新

Firebase設定の欠落していた手順を追加し、環境変数の
セットアッププロセスを明確化。
```

---

## プルリクエストプロセス

### 提出前のチェック

- [ ] コードがプロジェクトのコーディング規約に従っている
- [ ] すべてのテストが合格
- [ ] ドキュメントが更新されている
- [ ] コミットメッセージがガイドラインに従っている
- [ ] ブランチが`main`と最新の状態
- [ ] マージコンフリクトがない

### PRタイトル

コミットメッセージと同じフォーマットを使用：

```
feat(scope): 簡潔な説明
```

### PR説明テンプレート

```markdown
## 説明
変更内容の簡潔な説明

## 変更の種類
- [ ] バグ修正
- [ ] 新機能
- [ ] 破壊的変更
- [ ] ドキュメント更新

## 関連Issue
Closes #123

## テスト
変更のテスト方法を説明

## スクリーンショット（該当する場合）
UI変更のスクリーンショットを追加

## チェックリスト
- [ ] コードがコーディング規約に従っている
- [ ] テストを追加/更新
- [ ] ドキュメントを更新
- [ ] 破壊的変更なし（または文書化済み）
```

### レビュープロセス

1. **自動チェック**: GitHub Actionsが自動的にテストを実行
2. **コードレビュー**: メンテナーがコードをレビュー
3. **フィードバック**: 要求された変更に対応
4. **承認**: 承認されると、PRがマージされます

### マージ後

- フィーチャーブランチを削除
- フォークをupstreamと同期
- お祝い！ 🎉

---

## 問題の報告

### 報告前の確認

- 重複を避けるため、既存のIssueを検索
- 最新バージョンで問題が存在することを確認
- 関連情報を収集（ログ、スクリーンショットなど）

### Issueテンプレート

```markdown
## 説明
問題の明確な説明

## 再現手順
1. '...'に移動
2. '...'をクリック
3. エラーを確認

## 期待される動作
期待していた動作

## 実際の動作
実際に起こった動作

## 環境
- OS: [例: macOS 14.0]
- ブラウザ: [例: Chrome 120]
- Goバージョン: [例: 1.25]
- Nodeバージョン: [例: 20.10]

## 追加コンテキスト
その他の関連情報
```

### Issueラベル

- `bug`: 何かが動作していない
- `enhancement`: 新機能またはリクエスト
- `documentation`: ドキュメント改善
- `good first issue`: 初心者に適している
- `help wanted`: 特別な注意が必要
- `question`: さらなる情報が必要

---

## 質問がありますか？

貢献に関する質問がある場合は、お気軽に：

- GitHubでディスカッションを開く
- プルリクエストのコメントで質問
- メンテナーに連絡

TYPECASTへの貢献ありがとうございます！ 🎬✨
