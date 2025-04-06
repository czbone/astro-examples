import express from 'express'
import { handler as ssrHandler } from './dist/server/entry.mjs'

const app = express()
const PORT = process.env.PORT || 3000

// publicディレクトリを静的ファイルとして提供する
app.use(express.static('public'))

// ビルド後のクライアントサイドファイルも提供
app.use(express.static('dist/client'))

// Astro SSRハンドラーを設定
app.use(ssrHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
