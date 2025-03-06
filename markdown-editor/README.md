# Markdown エディタ

Astroで構築された、シンプルで使いやすいMarkdownエディタです。左側でMarkdownを編集し、右側でリアルタイムのプレビューを確認できます。

## 主な機能

- **分割表示**: 左側で編集、右側でプレビューのリアルタイム表示
- **画像アップロード**: ドラッグ＆ドロップで簡単に画像をアップロード
- **GitHub風スタイリング**: 美しいGitHub風のMarkdownプレビュー
- **シンプルなUI**: 直感的で使いやすいインターフェース

## 技術スタック

- [Astro](https://astro.build/) - Webサイトビルドフレームワーク
- [React](https://reactjs.org/) - UIコンポーネント
- [TypeScript](https://www.typescriptlang.org/) - 型安全な開発
- [marked](https://marked.js.org/) - Markdownパーサー

## 必要環境

- Node.js v18以上
- pnpm v10.5.2以上（推奨）

## インストール

```bash
cd astro-markdown-editor

# 依存関係のインストール
pnpm install
```

## 開発手順

```bash
# 開発サーバーの起動
pnpm dev

# プロダクションビルド
pnpm build

# ビルドのプレビュー
pnpm preview

# プロダクションサーバーの起動
pnpm start

# コードフォーマット
pnpm format

# リント実行
pnpm lint
```

## プロジェクト構造

```
astro-markdown-editor/
├── public/
│   └── uploads/      # アップロードされた画像が保存されるディレクトリ
├── src/
│   ├── components/
│   │   └── MarkdownEditor.tsx  # メインのエディタコンポーネント
│   ├── pages/
│   │   ├── api/
│   │   │   └── upload.ts       # 画像アップロード用APIエンドポイント
│   │   └── index.astro         # メインページ
```

## 使用方法

1. エディタの左側のテキストエリアにMarkdown形式でテキストを入力します
2. 入力したMarkdownのプレビューが右側に表示されます
3. 画像をエディタ領域にドラッグ＆ドロップすると自動的にアップロードされ、Markdown形式で挿入されます

## 対応しているMarkdown構文

- 見出し（`# 見出し`）
- リスト（`- アイテム`）
- 番号付きリスト（`1. アイテム`）
- コードブロック（\```言語\```）
- 表
- 引用（`> 引用`）
- リンク（`[テキスト](URL)`）
- 画像（`![代替テキスト](画像URL)`）
- 強調（`**太字**`、`*斜体*`）

## ライセンス

MIT
