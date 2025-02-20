import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const formData = await request.formData();
    const files = formData.getAll('files');
    const uploadResults = [];

    for (const file of files) {
      if (file instanceof File) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = join(process.cwd(), 'uploads', fileName);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);

        uploadResults.push({
          filename: fileName,
          path: `/uploads/${fileName}`
        });
      }
    }

    return new Response(JSON.stringify({
      message: 'ファイルが正常にアップロードされました',
      files: uploadResults
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('アップロードエラー:', error);
    return new Response(JSON.stringify({
      error: 'ファイルアップロードに失敗しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};