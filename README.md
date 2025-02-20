# Astroサンプルプロジェクト

このリポジトリには、Astroを使用した実験的なサンプルアプリケーションが含まれています。
SSRの処理を中心に、クライアントとサーバ間での連携処理のサンプルを追加していきます。

## プロジェクト一覧

### 1. single-file-upload
単一ファイルのアップロードに特化したシンプルな実装です。

- **主な特徴**:
  - 1ファイルずつのアップロード

### 2. multi-file-upload
Expressとの統合による複数ファイルアップロード実装です。

- **主な特徴**:
  - 複数ファイルの同時アップロード
  - AstroとExpressを統合した仕様
  - Multerを使用

### 3. multi-file-upload2
Astro単独での複数ファイルアップロード実装です。

- **主な特徴**:
  - 複数ファイルの同時アップロード
  - Astro APIルートを使用した実装

### 4. multi-file-upload-dropzone
AstroとReactを使用したドラッグ&ドロップ対応の実装です。

- **主な特徴**:
  - ドラッグ&ドロップによるファイルアップロード
  - プレビュー機能付き
  - 進捗状況の視覚的フィードバック
  - 対応ファイル形式：
    - 画像ファイル（image/*）
    - PDF（application/pdf）
    - Wordファイル（.doc, .docx）
    - Excelファイル（.xls, .xlsx）

## ライセンス

各プロジェクトはMITライセンスの下で公開されています。

## プロジェクトの選び方

- シンプルな実装が必要な場合: `single-file-upload`
- Expressとの統合が必要な場合: `multi-file-upload`
- Astro単独で複数ファイル対応が必要な場合: `multi-file-upload2`
- ドラッグ&ドロップとプレビュー機能が必要な場合: `multi-file-upload-dropzone`
