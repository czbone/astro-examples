import { useEffect, useRef } from 'react';
import Dropzone from 'dropzone';
import type { DropzoneFile } from 'dropzone';
import 'dropzone/dist/dropzone.css';

interface UploadResponse {
  files: Array<{
    filename: string;
    path: string;
  }>;
}

export const FileUpload = () => {
  const dropzoneRef = useRef<Dropzone | null>(null);
  const statusDivRef = useRef<HTMLDivElement>(null);
  const uploadedFiles = useRef<Array<{filename: string; path: string}>>([]);

  useEffect(() => {
    // Dropzoneのグローバル設定
    Dropzone.autoDiscover = false;

    // Dropzoneインスタンスの作成
    dropzoneRef.current = new Dropzone('#uploadForm', {
      url: '/api/upload',
      paramName: 'files',
      maxFilesize: 5, // MB
      acceptedFiles: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
      dictDefaultMessage: 'ファイルをドラッグ&ドロップするか、クリックして選択してください',
      dictFileTooBig: 'ファイルが大きすぎます ({{filesize}}MB). 最大サイズ: {{maxFilesize}}MB',
      dictInvalidFileType: '無効なファイル形式です',
      addRemoveLinks: true,
      dictRemoveFile: '削除',
      dictCancelUpload: 'キャンセル',
      dictUploadCanceled: 'アップロードがキャンセルされました',
      dictResponseError: 'サーバーエラー {{statusCode}}',
    });

    const dropzone = dropzoneRef.current;

    // アップロード成功時の処理
    dropzone.on('success', (file: DropzoneFile, response: UploadResponse) => {
      const result = JSON.parse(typeof response === 'string' ? response : JSON.stringify(response));
      file.previewElement?.classList.add('dz-success');

      uploadedFiles.current = [...uploadedFiles.current, ...result.files];
      if (statusDivRef.current) {
        statusDivRef.current.innerHTML = `
          <p class="success">アップロード成功！</p>
          <ul>
            ${uploadedFiles.current.map((file: { filename: string; path: string }) => `
              <li><a href="${file.path}" target="_blank">${file.filename}</a></li>
            `).join('')}
          </ul>
        `;
      }
    });

    // エラー発生時の処理
    dropzone.on('error', (file: DropzoneFile, errorMessage: string | Error) => {
      file.previewElement?.classList.add('dz-error');
      if (statusDivRef.current) {
        statusDivRef.current.innerHTML = `
          <p class="error">エラー: ${errorMessage instanceof Error ? errorMessage.message : errorMessage}</p>
        `;
      }
    });

    // クリア処理を追加
    dropzone.on('reset', () => {
      uploadedFiles.current = [];
      if (statusDivRef.current) {
        statusDivRef.current.innerHTML = '';
      }
    });

    // クリーンアップ関数
    return () => {
      dropzone.destroy();
    };
  }, []);

  return (
    <div className="upload-container">
      <form id="uploadForm" className="dropzone" encType="multipart/form-data">
        <div className="dz-message" data-dz-message>
          <span>ファイルをドラッグ&ドロップするか、クリックして選択してください</span>
        </div>
      </form>
      <div ref={statusDivRef} id="uploadStatus" />

      <style>{`
        .upload-container {
          margin: 2rem auto;
          padding: 1rem;
          max-width: 800px;
        }

        .dropzone {
          border: 2px dashed #4a9eff;
          border-radius: 8px;
          padding: 20px;
          background: #f8f9fa;
        }

        .dropzone .dz-message {
          margin: 2em 0;
          font-size: 1.2em;
          color: #666;
        }

        .success {
          color: #198754;
          background: #d1e7dd;
          padding: 0.75rem;
          border-radius: 4px;
          margin-top: 1rem;
        }

        .error {
          color: #dc3545;
          background: #f8d7da;
          padding: 0.75rem;
          border-radius: 4px;
          margin-top: 1rem;
        }

        /* Dropzoneプレビューのカスタマイズ */
        .dropzone .dz-preview {
          margin: 1rem;
        }

        .dropzone .dz-preview .dz-image {
          border-radius: 8px;
        }

        .dropzone .dz-preview .dz-details {
          padding: 1rem;
        }

        /* アイコンの透明度を修正 */
        .dropzone .dz-preview.dz-success .dz-success-mark,
        .dropzone .dz-preview.dz-error .dz-error-mark {
          opacity: 1;
        }

        /* ホバー時にアイコンを非表示にする */
        .dropzone .dz-preview:hover .dz-success-mark,
        .dropzone .dz-preview:hover .dz-error-mark {
          display: none;
        }

        /* 成功アイコンのスタイル */
        .dropzone .dz-preview .dz-success-mark {
          color: #ffffff;
        }
        .dropzone .dz-preview .dz-success-mark svg {
          background-color: #198754;
          border-radius: 50%;
          padding: 4px;
        }
        .dropzone .dz-preview .dz-success-mark svg path {
          fill: #ffffff;
          stroke: #ffffff;
          stroke-width: 1;
        }

        /* エラーアイコンのスタイル */
        .dropzone .dz-preview .dz-error-mark {
          color: #ffffff;
        }
        .dropzone .dz-preview .dz-error-mark svg {
          background-color: #dc3545;
          border-radius: 50%;
          padding: 4px;
        }
        .dropzone .dz-preview .dz-error-mark svg path {
          fill: #ffffff;
          stroke: #ffffff;
          stroke-width: 1;
        }

        /* アイコンのアニメーション調整 */
        .dropzone .dz-preview.dz-success .dz-success-mark,
        .dropzone .dz-preview.dz-error .dz-error-mark {
          animation: slide-in 1s cubic-bezier(0.77, 0, 0.175, 1);
        }

        @keyframes slide-in {
          0% {
            opacity: 0;
            transform: translateY(-50px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload; 