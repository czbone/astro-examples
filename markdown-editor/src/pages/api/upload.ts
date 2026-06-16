import type { APIRoute } from 'astro'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export const POST: APIRoute = async ({ request }) => {
  console.log('ファイルアップロードAPIが呼び出されました')

  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const pdfFile = formData.get('pdf') as File | null
    const file = imageFile || pdfFile

    if (!file) {
      console.error('ファイルが見つかりません')
      return new Response(JSON.stringify({ error: 'ファイルが見つかりません' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log(`ファイルサイズ: ${buffer.length} バイト`)
    console.log(`ファイルタイプ: ${file.type}`)

    // ファイル名を一意にする
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`

    // アップロードディレクトリを確保
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      console.log(`ディレクトリを作成します: ${uploadDir}`)
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = join(uploadDir, fileName)

    // ファイルを保存
    await writeFile(filePath, buffer)

    // アップロードされたファイルのURLを返す
    const fileUrl = `/uploads/${fileName}`

    console.log(`ファイルを保存しました: ${filePath}`)
    console.log(`アクセスURL: ${fileUrl}`)

    return new Response(
      JSON.stringify({
        url: fileUrl,
        success: true,
        message: 'ファイルが正常にアップロードされました'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('アップロードエラー:', error)
    return new Response(
      JSON.stringify({
        error: 'アップロードに失敗しました',
        details: String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
