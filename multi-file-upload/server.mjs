import express from 'express';
import { handler as ssrHandler } from './dist/server/entry.mjs';
import multer from 'multer';
import path from 'path';

const app = express();
// Change this based on your astro.config.mjs, `base` option.
// They should match. The default value is "/".
const base = '/';

// multerの設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // アップロードされたファイルの保存先
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname) // ファイル名の設定
  }
});

const upload = multer({ storage: storage });

// アップロードディレクトリを静的ファイルとして提供
app.use('/uploads', express.static('uploads'));

// 複数ファイルアップロード用のエンドポイント
app.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    const files = req.files;
    res.json({
      message: 'ファイルが正常にアップロードされました',
      files: files.map(file => ({
        filename: file.filename,
        path: `/uploads/${file.filename}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'ファイルアップロードに失敗しました' });
  }
});

app.use(base, express.static('dist/client/'));
app.use(ssrHandler);

//app.listen(8080);
const port = 3000
app.listen(port, () => {
  console.log(`サーバが開始されました: http://localhost:${port}`)
})