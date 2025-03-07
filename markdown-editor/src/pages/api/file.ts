import type { APIRoute } from 'astro'
import fs from 'node:fs/promises'
import path from 'node:path'

// ファイルのベースディレクトリ
const DOCS_DIR = path.join(process.cwd(), 'docs')

// ファイルパスのバリデーション
function validateFilePath(filePath: string): boolean {
  // ディレクトリトラバーサル対策
  const normalizedPath = path.normalize(filePath)
  return normalizedPath.startsWith(DOCS_DIR) && !normalizedPath.includes('..')
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // URLからファイル名を取得
    const url = new URL(request.url)
    const fileName = url.searchParams.get('file')

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'ファイル名が指定されていません' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ファイルパスを構築
    const filePath = path.join(DOCS_DIR, fileName)

    // パスのバリデーション
    if (!validateFilePath(filePath)) {
      return new Response(JSON.stringify({ error: '無効なファイルパスです' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ファイルが存在するか確認
    try {
      await fs.access(filePath)
    } catch (error) {
      // ファイルが存在しない場合、空の内容を返す
      return new Response(JSON.stringify({ content: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ファイルを読み込む
    const content = await fs.readFile(filePath, 'utf-8')

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('ファイル読み込みエラー:', error)
    return new Response(
      JSON.stringify({ error: `ファイルの読み込みに失敗しました: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { fileName, content } = await request.json()

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'ファイル名が指定されていません' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ファイルパスを構築
    const filePath = path.join(DOCS_DIR, fileName)

    // パスのバリデーション
    if (!validateFilePath(filePath)) {
      return new Response(JSON.stringify({ error: '無効なファイルパスです' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // docsディレクトリが存在するか確認し、なければ作成
    try {
      await fs.access(DOCS_DIR)
    } catch (error) {
      await fs.mkdir(DOCS_DIR, { recursive: true })
    }

    // ファイルを書き込む
    await fs.writeFile(filePath, content, 'utf-8')

    return new Response(JSON.stringify({ success: true, message: 'ファイルを保存しました' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('ファイル保存エラー:', error)
    return new Response(
      JSON.stringify({ error: `ファイルの保存に失敗しました: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
