# Coolify向けAstro SSR standaloneアプリケーション用Dockerfile
# マルチステージビルドで本番イメージを軽量化

# ベースステージ: Node.js 24 Alpine
FROM node:24-alpine AS base
WORKDIR /app

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# ビルドステージ
FROM base AS build
WORKDIR /app

# package.jsonとロックファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# すべての依存関係（devDependencies含む）をインストール
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# Astroアプリケーションのビルド
RUN pnpm run build

# 本番ステージ
FROM node:24-alpine AS production
WORKDIR /app

# ヘルスチェック用
RUN apk add --no-cache curl

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ビルド成果物をコピー
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# アップロードファイル保存用ディレクトリ
RUN mkdir -p uploads && chown nodejs:nodejs uploads

# 起動スクリプトをコピー
COPY --chown=nodejs:nodejs entrypoint.sh healthcheck.sh ./
RUN chmod +x entrypoint.sh healthcheck.sh

# 非rootユーザーに切り替え
USER nodejs

# 待ち受けポートは Coolify の Ports Exposes で指定（PORT 環境変数として注入される）
# NOTE: EXPOSE / ENV PORT は Dockerfile に書かない（Coolify 設定と競合し docker ps が 3000-3001 になる）

# ヘルスチェック（healthcheck.sh が実行時の PORT を参照）
HEALTHCHECK --interval=30s --timeout=3s --start-period=90s --retries=3 \
    CMD ./healthcheck.sh

# 起動スクリプトを実行
ENTRYPOINT ["./entrypoint.sh"]
