import { marked } from 'marked'
import React, { useCallback, useRef, useState } from 'react'

interface MarkdownEditorProps {
  initialValue?: string
  onChange?: (value: string) => void
}

// YouTubeのURLを抽出して埋め込みiframeに変換する関数
// この関数は生のテキストに対して実行し、マークアップを追加する
const processYouTubeUrls = (markdownText: string): string => {
  // YouTube URLのパターン (標準のURLとshort URLの両方に対応)
  const youtubeRegex =
    /(^|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&\S*)?)(\s|$)/g

  // YouTube URLをマークダウンの特殊構文に置き換え、あとで処理できるようにする
  // ここでは !!!YOUTUBE_ID!!! という特殊なプレースホルダーを使用
  return markdownText.replace(youtubeRegex, (match, before, url, videoId, after) => {
    return `${before}!!!YOUTUBE_${videoId}!!!${after}`
  })
}

// 特殊プレースホルダーをiframe埋め込みに置き換える関数
const replaceYouTubePlaceholders = (html: string): string => {
  const placeholderRegex = /!!!YOUTUBE_([a-zA-Z0-9_-]{11})!!!/g

  return html.replace(placeholderRegex, (match, videoId) => {
    return `
      <div class="youtube-embed">
        <iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/${videoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    `
  })
}

// markedのオプション設定
marked.setOptions({
  breaks: true, // 改行を<br>に変換
  gfm: true // GitHub Flavored Markdownを有効化
})

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialValue = '', onChange }) => {
  const [markdown, setMarkdown] = useState(initialValue)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })

  // マークダウンをHTMLに変換する関数
  const renderMarkdown = (markdownText: string): string => {
    // 1. まずYouTube URLを特殊プレースホルダーに置き換え
    const processedMarkdown = processYouTubeUrls(markdownText)

    // 2. マークダウンをHTMLに変換
    const html = marked(processedMarkdown) as string

    // 3. プレースホルダーをiframe埋め込みに置き換え
    return replaceYouTubePlaceholders(html)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setMarkdown(newValue)
    onChange?.(newValue)
    // カーソル位置を更新
    setCursorPosition({
      start: e.target.selectionStart || 0,
      end: e.target.selectionEnd || 0
    })
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    setCursorPosition({
      start: textarea.selectionStart || 0,
      end: textarea.selectionEnd || 0
    })
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      const files = e.dataTransfer.files

      // ドロップした瞬間のカーソル位置を保存（テキストエリアがフォーカスを持っている場合）
      if (document.activeElement === e.currentTarget) {
        setCursorPosition({
          start: e.currentTarget.selectionStart || 0,
          end: e.currentTarget.selectionEnd || 0
        })
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file && file.type.startsWith('image/')) {
          setUploading(true)
          setUploadError(null)

          const formData = new FormData()
          formData.append('image', file)

          try {
            console.log('画像をアップロード中:', file.name)

            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            })

            console.log('APIレスポンスステータス:', response.status)

            // レスポンスのJSONを一度だけ解析
            const data = await response.json()
            console.log('APIレスポンスデータ:', data)

            if (!response.ok) {
              throw new Error(data.error || 'アップロードに失敗しました')
            }

            // 成功した場合の処理
            if (!data.url) {
              throw new Error('画像URLが見つかりません')
            }

            const imageUrl = data.url
            console.log('画像のアップロードに成功:', imageUrl)

            // 保存していたカーソル位置または末尾に画像を挿入
            const { start, end } = cursorPosition
            const newText =
              markdown.substring(0, start) +
              `![${file.name}](${imageUrl})` +
              markdown.substring(end)

            setMarkdown(newText)
            onChange?.(newText)
            // エラー状態をクリア
            setUploadError(null)
          } catch (error) {
            console.error('画像のアップロードに失敗しました:', error)
            setUploadError(
              `画像のアップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
            )
          } finally {
            setUploading(false)
          }
        } else if (file) {
          setUploadError(`サポートされていないファイル形式です: ${file.type}`)
        } else {
          setUploadError('画像ファイルのみアップロード可能です')
        }
      }
    },
    [markdown, onChange, cursorPosition]
  )

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
  }

  return (
    <div className="markdown-editor">
      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={handleChange}
          onSelect={handleSelect}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          placeholder="Markdownを入力してください..."
          className="editor"
        />
        {uploading && <div className="upload-status">画像をアップロード中...</div>}
        {uploadError && <div className="upload-error">{uploadError}</div>}
      </div>
      <div className="preview-container">
        <div
          className="preview markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
        />
      </div>
      <style>{`
        .markdown-editor {
          display: flex;
          gap: 1rem;
          height: 100%;
          min-height: 500px;
        }

        .editor-container,
        .preview-container {
          flex: 1;
          padding: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          position: relative;
        }

        .editor {
          width: 100%;
          height: 100%;
          min-height: 500px;
          padding: 1rem;
          border: none;
          resize: none;
          font-family: monospace;
          font-size: 14px;
          line-height: 1.5;
        }

        .preview {
          height: 100%;
          overflow-y: auto;
          padding: 1rem;
        }
        
        /* Markdownスタイル */
        .markdown-body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #24292e;
        }
        
        .markdown-body h1 {
          font-size: 2em;
          margin-top: 0.67em;
          margin-bottom: 0.67em;
          font-weight: 600;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #eaecef;
        }
        
        .markdown-body h2 {
          font-size: 1.5em;
          margin-top: 1em;
          margin-bottom: 1em;
          font-weight: 600;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #eaecef;
        }
        
        .markdown-body h3 {
          font-size: 1.25em;
          margin-top: 1em;
          margin-bottom: 1em;
          font-weight: 600;
        }
        
        .markdown-body h4 {
          font-size: 1em;
          margin-top: 1em;
          margin-bottom: 1em;
          font-weight: 600;
        }
        
        .markdown-body h5 {
          font-size: 0.875em;
          margin-top: 1em;
          margin-bottom: 1em;
          font-weight: 600;
        }
        
        .markdown-body h6 {
          font-size: 0.85em;
          margin-top: 1em;
          margin-bottom: 1em;
          font-weight: 600;
          color: #6a737d;
        }
        
        .markdown-body p {
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .markdown-body a {
          color: #0366d6;
          text-decoration: none;
        }
        
        .markdown-body a:hover {
          text-decoration: underline;
        }
        
        .markdown-body ul,
        .markdown-body ol {
          padding-left: 2em;
          margin-top: 0;
          margin-bottom: 16px;
        }
        
        .markdown-body ul {
          list-style-type: disc;
        }
        
        .markdown-body ol {
          list-style-type: decimal;
        }
        
        .markdown-body li {
          margin-top: 0.25em;
        }
        
        .markdown-body blockquote {
          margin: 0;
          padding: 0 1em;
          color: #6a737d;
          border-left: 0.25em solid #dfe2e5;
        }
        
        .markdown-body pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: #f6f8fa;
          border-radius: 3px;
          word-wrap: normal;
        }
        
        .markdown-body code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: rgba(27, 31, 35, 0.05);
          border-radius: 3px;
          font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
        }
        
        .markdown-body pre code {
          padding: 0;
          margin: 0;
          background-color: transparent;
          border: 0;
          word-break: normal;
          white-space: pre;
          display: inline;
          overflow: visible;
          line-height: inherit;
          word-wrap: normal;
        }
        
        .markdown-body img {
          max-width: 100%;
          box-sizing: content-box;
          border-style: none;
        }
        
        .markdown-body table {
          display: block;
          width: 100%;
          overflow: auto;
          border-spacing: 0;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        
        .markdown-body table th {
          font-weight: 600;
        }
        
        .markdown-body table th,
        .markdown-body table td {
          padding: 6px 13px;
          border: 1px solid #dfe2e5;
        }
        
        .markdown-body table tr {
          background-color: #fff;
          border-top: 1px solid #c6cbd1;
        }
        
        .markdown-body table tr:nth-child(2n) {
          background-color: #f6f8fa;
        }
        
        .markdown-body hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: #e1e4e8;
          border: 0;
        }

        .upload-status {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background-color: #f0f9ff;
          color: #0369a1;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .upload-error {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background-color: #fef2f2;
          color: #b91c1c;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .youtube-embed {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9のアスペクト比 */
          margin-bottom: 16px;
        }
        
        .youtube-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>
  )
}

export default MarkdownEditor
