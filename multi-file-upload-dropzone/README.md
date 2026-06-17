# マルチファイルアップローダー

## 📝 概要

このプロジェクトは、Astro.jsとReactを使用したドラッグ&ドロップ対応のファイルアップロードアプリケーションです。Dropzoneを活用して、直感的なファイルアップロード機能を提供します。

[Coolify](https://coolify.io/) へのデプロイにも対応しており、`docker-compose.yaml` と `Dockerfile` により Docker Compose Build Pack から本番環境へデプロイできます。手順は後述の「Coolifyでのデプロイ（Docker Compose）」を参照してください。

![Image](https://github.com/user-attachments/assets/587c5821-bc9b-4562-b641-67402804fe4b)

## ✨ 主な機能

- ドラッグ&ドロップによるファイルアップロード
- 複数ファイルの同時アップロード
- プレビュー機能付き
- 進捗状況の視覚的フィードバック
- アップロード成功/エラー表示
- アップロードされたファイルへのリンク生成

## 🛠️ 技術スタック

- **Astro.js**: SSRモードで動作するフレームワーク
- **React**: UIコンポーネント
- **Dropzone.js**: ファイルアップロード機能
- **TypeScript**: 型安全な開発

## 📦 対応ファイル形式

- 画像ファイル（image/*）
- PDF（application/pdf）
- Wordファイル（.doc, .docx）
- Excelファイル（.xls, .xlsx）

## 🚀 始め方

1. リポジトリをクローン:

```bash
git clone [リポジトリURL]
```

2. 依存関係のインストール:
```bash
pnpm install
```

3. 開発サーバーの起動:
```bash
pnpm dev
```

4. ブラウザで開く:
```bash
http://localhost:4321
```

## 📂 プロジェクト構成

```
/
├── src/
│   ├── components/
│   │   └── FileUpload.tsx    # アップロードコンポーネント
│   ├── layouts/
│   │   └── Layout.astro      # 共通レイアウト
│   └── pages/
│       ├── index.astro       # メインページ
│       └── api/upload.ts     # アップロードAPI
└── uploads/                  # アップロードファイルの保存先
```

## 📦 利用可能なコマンド

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 開発サーバーを起動（localhost:4321） |
| `pnpm build` | プロダクション用にビルド |
| `pnpm preview` | ビルドしたサイトをローカルでプレビュー（開発環境テスト用） |
| `pnpm start` | ビルドしたサイトを本番環境用サーバーとして起動 |

## ☁️ Coolifyでのデプロイ（Docker Compose）

このプロジェクトは [Coolify](https://coolify.io/) 向けに `docker-compose.yaml` と `Dockerfile` が用意されています。

### 前提条件

- Coolify v4 インスタンスが稼働していること
- Git リポジトリ [`czbone/astro-examples`](https://github.com/czbone/astro-examples) へのアクセス権があること

### デプロイ手順

1. Coolify ダッシュボードで **New Resource** → Git リポジトリ（Public / Private）を選択
2. リポジトリ `astro-examples` とデプロイ対象ブランチを指定
3. **Build Pack** で `Docker Compose` を選択
4. **General** タブで以下を設定:

| 設定項目 | 値 | 理由 |
|----------|-----|------|
| Base Directory | `multi-file-upload-dropzone` | monorepo のサブディレクトリがアプリ本体 |
| Docker Compose Location | `docker-compose.yaml` | ファイル名が `.yaml`（`.yml` ではない） |
| Port Exposes | `3000` | Coolify が `PORT` 環境変数を注入し、ヘルスチェックと Compose が参照 |

5. **Domains** タブでドメインを割り当て（HTTPS は Coolify プロキシが自動処理）
6. **Deploy** を実行

### 永続ストレージ

`docker-compose.yaml` で Named Volume が定義されており、アップロードファイルは再デプロイ後も保持されます。

```yaml
volumes:
  - uploads_data:/app/uploads
```

- アップロードファイルはコンテナ内 `/app/uploads` に保存される
- `uploads_data` ボリュームにより、再デプロイ後もファイルが保持される
- Coolify UI の Persistent Storage で手動追加は不要（Compose 定義で十分）

### ポート・環境変数

- **Port Exposes** を `3000` に設定すれば、Coolify が `PORT=3000` を自動注入する
- `Dockerfile` には意図的に `EXPOSE` / `ENV PORT` を書いていない（Coolify 設定との競合回避）。手動で `PORT` を上書きしないこと
- 追加の環境変数は現状不要（アプリは `.env` 非依存）

### 動作確認

- デプロイ完了後、割り当てたドメインにアクセスする
- ファイルをドラッグ&ドロップしてアップロード成功を確認する
- Coolify のヘルスチェックが `healthy` になること（Dockerfile 内 `HEALTHCHECK` → `GET /`）

### トラブルシューティング

| 症状 | 確認事項 |
|------|----------|
| ビルド失敗（ファイルが見つからない） | Base Directory が `multi-file-upload-dropzone` になっているか |
| Compose ファイルが読み込まれない | `docker-compose.yml` ではなく `docker-compose.yaml` を指定しているか |
| 502 / 接続不可 | Port Exposes が `3000` と一致しているか |
| 再デプロイ後にファイルが消失 | Coolify の Storages タブで `uploads_data` ボリュームがマウントされているか |

## 💡 主な機能

- 複数ファイルの同時アップロード
- アップロードされたファイルへのリンク生成
- エラーハンドリングとステータス表示

## ⚠️ 注意事項

- アップロードされたファイルは `uploads/` ディレクトリに保存されます
- Coolify デプロイ時はコンテナ内 `/app/uploads`（`uploads_data` Named Volume 経由）に保存され、再デプロイ後も保持されます
