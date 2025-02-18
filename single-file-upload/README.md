# ファイルアップロードアプリケーション

## 概要
このプロジェクトは、Astroフレームワークを使用して構築された単一ファイルのアップロードアプリケーションです。

## 機能
- ファイルのアップロード
- サーバーサイドでのファイル保存

## セットアップ

### インストール
```sh
pnpm install
```

### 開発サーバーの起動
```sh
pnpm dev
```

### ビルドと実行
```sh
pnpm build
pnpm start
```

## プロジェクト構造
```text
/
├── public/
├── src/
│   ├── components/
│   │   ├── Card.astro
│   │   └── FileUpload.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       └── api/
│           └── upload.ts
└── uploads/      # アップロードされたファイルの保存先
```

## 環境設定
アプリケーションはデフォルトで3000ポートで動作します。設定は`astro.config.mjs`で変更可能です。
