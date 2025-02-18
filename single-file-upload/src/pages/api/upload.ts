import type { APIRoute } from 'astro';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'ファイルが見つかりません' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // アップロードディレクトリの作成
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ユニークなファイル名を生成
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.name);
    const newFilename = `file-${uniqueSuffix}${fileExtension}`;

    // ファイルを保存
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, newFilename);

    fs.writeFileSync(filePath, buffer);

    return new Response(JSON.stringify({
      success: true,
      filename: newFilename
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('アップロードエラー:', error);
    return new Response(JSON.stringify({
      error: 'ファイルアップロードに失敗しました'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};