import { marked } from 'marked'
import Prism from 'prismjs'
import React, { useCallback, useEffect, useRef, useState } from 'react'
// Markdownの構文ハイライト用のCSS
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
// PrismJSのデフォルトテーマをインポート
import 'prismjs/themes/prism.css'

interface MarkdownEditorProps {
  initialValue?: string
  onChange?: (value: string) => void
  fileName?: string // 編集するファイル名
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

// Markdownのシンタックスハイライト用の関数
const highlightMarkdown = (code: string) => {
  // 二重表示問題を防ぐためにコードブロック内のコンテンツを置換する特別な処理
  // コードブロックを一時的なプレースホルダーに置き換える
  const processedCode = code.replace(/```([a-z]*)([\s\S]*?)```/g, (match, lang, content) => {
    // 処理しやすいように特殊マーカーに一時的に置き換え
    return `%%%CODEBLOCK_START_${lang}%%%${content}%%%CODEBLOCK_END%%%`
  })

  // Prismでハイライト処理
  let html = ''
  if (Prism.languages.markdown) {
    html = Prism.highlight(processedCode, Prism.languages.markdown, 'markdown')
  } else {
    html = processedCode
  }

  // プレースホルダーを元に戻して正しくハイライト
  html = html.replace(
    /%%%CODEBLOCK_START_([a-z]*)%%%/g,
    '<span class="token code-block">```$1</span>'
  )
  html = html.replace(/%%%CODEBLOCK_END%%%/g, '<span class="token code-block">```</span>')

  return html
}

// markedのオプション設定
marked.setOptions({
  breaks: true, // 改行を<br>に変換
  gfm: true // GitHub Flavored Markdownを有効化
})

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialValue = '',
  onChange,
  fileName = 'document.md'
}) => {
  const [markdown, setMarkdown] = useState(initialValue)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })
  const [currentLine, setCurrentLine] = useState(1)
  const [lineCount, setLineCount] = useState(1)
  const [currentFileName, setCurrentFileName] = useState(fileName)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightedPreRef = useRef<HTMLPreElement>(null)

  // 初期データの読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      if (fileName) {
        setLoading(true)
        try {
          const response = await fetch(`/api/file?file=${encodeURIComponent(fileName)}`)

          if (!response.ok) {
            throw new Error(`ファイル読み込みエラー: ${response.status}`)
          }

          const data = await response.json()
          if (data.content !== undefined) {
            setMarkdown(data.content)
            onChange?.(data.content)
          }
        } catch (error) {
          console.error('初期データ読み込みエラー:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadInitialData()
  }, [fileName, onChange])

  // ファイル保存処理
  const saveFile = async () => {
    if (!currentFileName) return

    setSaving(true)
    setSaveStatus(null)

    try {
      const response = await fetch('/api/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: currentFileName,
          content: markdown
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました')
      }

      setSaveStatus({
        type: 'success',
        message: '保存しました'
      })

      // 成功メッセージは3秒後に消える
      setTimeout(() => {
        setSaveStatus(null)
      }, 3000)
    } catch (error) {
      console.error('ファイル保存エラー:', error)
      setSaveStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '保存に失敗しました'
      })
    } finally {
      setSaving(false)
    }
  }

  // 画像のドロップ位置を制御する前に、フォーカスとカーソル位置を設定
  const focusEditor = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // マークダウンをHTMLに変換する関数
  const renderMarkdown = (markdownText: string): string => {
    // 1. まずYouTube URLを特殊プレースホルダーに置き換え
    const processedMarkdown = processYouTubeUrls(markdownText)

    // 2. マークダウンをHTMLに変換
    const html = marked(processedMarkdown) as string

    // 3. プレースホルダーをiframe埋め込みに置き換え
    return replaceYouTubePlaceholders(html)
  }

  // 行数の計算
  useEffect(() => {
    if (markdown) {
      setLineCount((markdown.match(/\n/g) || []).length + 1)
    } else {
      setLineCount(1)
    }
  }, [markdown])

  // エディタと行番号のスクロール同期を設定
  useEffect(() => {
    if (textareaRef.current) {
      const updateScroll = () => {
        // ハイライト表示の同期
        if (highlightedPreRef.current) {
          highlightedPreRef.current.scrollTop = textareaRef.current!.scrollTop
          highlightedPreRef.current.scrollLeft = textareaRef.current!.scrollLeft
        }

        // 行番号の同期
        const lineNumbersContainer = textareaRef
          .current!.closest('.editor-area')
          ?.querySelector('.line-numbers')
        if (lineNumbersContainer) {
          const lineNumbersElement = lineNumbersContainer as HTMLElement
          lineNumbersElement.scrollTop = textareaRef.current!.scrollTop
        }
      }

      // 初期スクロール位置を設定
      updateScroll()

      // スクロールイベントリスナーを追加
      textareaRef.current.addEventListener('scroll', updateScroll)

      return () => {
        // クリーンアップ
        textareaRef.current?.removeEventListener('scroll', updateScroll)
      }
    }
  }, [])

  // エディタコンテンツのシンタックスハイライト
  useEffect(() => {
    if (highlightedPreRef.current && textareaRef.current) {
      const html = highlightMarkdown(markdown)
      highlightedPreRef.current.innerHTML = html

      // スクロール位置の同期
      highlightedPreRef.current.scrollTop = textareaRef.current.scrollTop
      highlightedPreRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [markdown])

  // 現在のカーソル位置から行番号を計算
  const calculateCurrentLine = (position: number) => {
    const textBeforeCursor = markdown.substring(0, position)
    return (textBeforeCursor.match(/\n/g) || []).length + 1
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setMarkdown(newValue)
    onChange?.(newValue)

    // カーソル位置を更新
    const newPosition = {
      start: e.target.selectionStart || 0,
      end: e.target.selectionEnd || 0
    }
    setCursorPosition(newPosition)
    setCurrentLine(calculateCurrentLine(newPosition.start))
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const newPosition = {
      start: textarea.selectionStart || 0,
      end: textarea.selectionEnd || 0
    }
    setCursorPosition(newPosition)
    setCurrentLine(calculateCurrentLine(newPosition.start))
  }

  // カーソル移動時の現在行を更新
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    setCursorPosition({
      start: textarea.selectionStart || 0,
      end: textarea.selectionEnd || 0
    })
    setCurrentLine(calculateCurrentLine(textarea.selectionStart || 0))
  }

  // タブキーの処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // 選択されたテキストの前後にタブを挿入
      const newValue =
        markdown.substring(0, start) +
        '  ' + // 2スペースでタブを表現
        markdown.substring(end)

      setMarkdown(newValue)
      onChange?.(newValue)

      // カーソル位置を更新
      setTimeout(() => {
        textarea.selectionStart = start + 2
        textarea.selectionEnd = start + 2
      }, 0)
    }
  }

  // テキストエリアのスクロールを背後のハイライト要素と行番号に同期
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightedPreRef.current) {
      highlightedPreRef.current.scrollTop = e.currentTarget.scrollTop
      highlightedPreRef.current.scrollLeft = e.currentTarget.scrollLeft
    }

    // 行番号コンテナも同期
    const lineNumbersContainer = e.currentTarget
      .closest('.editor-area')
      ?.querySelector('.line-numbers')
    if (lineNumbersContainer) {
      const lineNumbersElement = lineNumbersContainer as HTMLElement
      lineNumbersElement.scrollTop = e.currentTarget.scrollTop
    }
  }

  // 行番号の生成
  const generateLineNumbers = () => {
    return Array.from({ length: lineCount }, (_, i) => (
      <div
        key={i + 1}
        className={`line-number ${currentLine === i + 1 ? 'current-line-number' : ''}`}
      >
        {i + 1}
      </div>
    ))
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const files = e.dataTransfer.files

      // テキストエリアにフォーカスを確保
      focusEditor()

      // 現在のカーソル位置を取得 (フォーカスが設定されていれば)
      let insertPosition = 0
      if (textareaRef.current) {
        // カーソル位置が設定されていない場合、末尾に挿入
        insertPosition = textareaRef.current.selectionStart || markdown.length
      } else {
        // フォールバック: 末尾に挿入
        insertPosition = markdown.length
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

            // キャレット位置に画像を挿入
            const markdownImage = `![${file.name}](${imageUrl})`
            const newText =
              markdown.substring(0, insertPosition) +
              markdownImage +
              markdown.substring(insertPosition)

            setMarkdown(newText)
            onChange?.(newText)

            // 新しいカーソル位置を設定（画像の後ろ）
            const newPosition = insertPosition + markdownImage.length
            if (textareaRef.current) {
              // カーソル位置を更新
              textareaRef.current.selectionStart = newPosition
              textareaRef.current.selectionEnd = newPosition
              // カーソル位置の状態も更新
              setCursorPosition({
                start: newPosition,
                end: newPosition
              })
              setCurrentLine(calculateCurrentLine(newPosition))
            }

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
    [markdown, onChange, calculateCurrentLine, focusEditor]
  )

  // エディタエリアのクリック処理
  const handleEditorAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // テキストエリアにフォーカスを移す
    focusEditor()
  }

  // ドラッグオーバー時の処理
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    // ドラッグ中にフォーカスを確保
    focusEditor()
  }

  return (
    <div className="markdown-editor">
      <div className="editor-container" ref={editorContainerRef}>
        <div className="editor-header">
          <div className="editor-info">
            <span className="file-name">{currentFileName}</span>
            <span className="editor-status">
              行: {currentLine}/{lineCount}
            </span>
          </div>
          <div className="editor-actions">
            <button
              className={`save-button ${saving ? 'saving' : ''}`}
              onClick={saveFile}
              disabled={saving || loading}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
        {saveStatus && <div className={`save-status ${saveStatus.type}`}>{saveStatus.message}</div>}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}
        <div
          className="editor-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleEditorAreaClick}
        >
          <div className="line-numbers">{generateLineNumbers()}</div>
          <div className="editor-wrapper">
            <div className="syntax-highlight-container">
              <pre ref={highlightedPreRef} className="syntax-highlighter" aria-hidden="true"></pre>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                placeholder="Markdownを入力してください..."
                className="editor"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
        {uploading && <div className="upload-status">画像をアップロード中...</div>}
        {uploadError && <div className="upload-error">{uploadError}</div>}
      </div>
      <div className="preview-container">
        <div className="preview-header">
          <span className="preview-title">プレビュー</span>
        </div>
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
          border: 1px solid #ddd;
          border-radius: 8px;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .editor-header, .preview-header {
          padding: 0.5rem 1rem;
          background-color: #f5f7f9;
          border-bottom: 1px solid #ddd;
          font-size: 0.9rem;
          color: #555;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .editor-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .file-name {
          font-weight: bold;
          color: #333;
        }
        
        .editor-status, .preview-title {
          font-family: monospace;
        }
        
        .editor-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .save-button {
          padding: 4px 12px;
          background-color: #0ea5e9;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        
        .save-button:hover {
          background-color: #0284c7;
        }
        
        .save-button:disabled {
          background-color: #94a3b8;
          cursor: not-allowed;
        }
        
        .save-button.saving {
          background-color: #94a3b8;
        }
        
        .save-status {
          position: absolute;
          top: 3rem;
          right: 1rem;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.9rem;
          z-index: 10;
          animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
        }
        
        .save-status.success {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .save-status.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
        }
        
        .loading-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #0ea5e9;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .editor-area {
          display: flex;
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        
        .line-numbers {
          padding: 1rem 0;
          background-color: #f5f7f9;
          border-right: 1px solid #eee;
          color: #999;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 15px;
          text-align: right;
          user-select: none;
          min-width: 3rem;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
          position: sticky;
          left: 0;
          z-index: 3;
          height: 100%;
        }
        
        /* Chromeのスクロールバーを非表示 */
        .line-numbers::-webkit-scrollbar {
          display: none;
        }
        
        .line-number {
          padding: 0 0.5rem;
          line-height: 1.5;
          height: 1.5em;
          white-space: nowrap;
        }
        
        .current-line-number {
          color: #0366d6;
          font-weight: bold;
        }

        .editor-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .syntax-highlight-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .syntax-highlighter {
          margin: 0;
          padding: 1rem;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 15px;
          line-height: 1.5;
          color: #333;
          white-space: pre-wrap;
          word-wrap: break-word;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #fff;
          pointer-events: none;
          z-index: 1;
          overflow: auto;
          box-sizing: border-box;
        }
        
        .editor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          padding: 1rem;
          border: none;
          resize: none;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 15px;
          line-height: 1.5;
          color: rgba(0, 0, 0, 0);
          background-color: transparent;
          z-index: 2;
          caret-color: #333;
          outline: none;
          box-sizing: border-box;
          overflow: auto;
        }

        /* タブサイズを固定 */
        .editor, .syntax-highlighter {
          tab-size: 2;
          -moz-tab-size: 2;
        }
        
        /* テキストカーソルを表示 */
        .editor::selection {
          background-color: rgba(0, 0, 255, 0.1);
        }
        
        /* プレースホルダーテキストを表示 */
        .editor::placeholder {
          color: #999;
          opacity: 1;
        }

        .preview {
          height: 100%;
          overflow-y: auto;
          padding: 1rem;
          background-color: #fff;
        }
        
        /* Markdown構文ハイライト */
        .token.title,
        .token.important,
        .token.header-1,
        .token.header-2,
        .token.header-3,
        .token.header-4,
        .token.header-5,
        .token.header-6 {
          color: #d73a49 !important;
          font-weight: bold;
        }
        
        .token.bold {
          color: #24292e;
          font-weight: bold;
        }
        
        .token.italic {
          color: #24292e;
          font-style: italic;
        }
        
        .token.strike {
          color: #24292e;
          text-decoration: line-through;
        }
        
        .token.url,
        .token.link {
          color: #0366d6;
          text-decoration: none;
        }
        
        .token.blockquote {
          color: #6a737d;
        }
        
        .token.code {
          color: #032f62;
          background-color: rgba(27, 31, 35, 0.05);
          padding: 0.2em 0.4em;
          border-radius: 3px;
        }
        
        .token.list {
          color: #6f42c1;
        }
        
        .token.punctuation {
          color: #6a737d;
        }
        
        .token.comment {
          color: #6a737d;
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
          margin-bottom: 1.5em; /* コードブロックの下部に余白を追加 */
        }
        
        /* コードブロックの後のp要素の上部マージンを確保 */
        .markdown-body pre + p {
          margin-top: 1em;
        }
        
        /* コードブロックの後の画像に十分な余白を確保 */
        .markdown-body pre + p img {
          margin-top: 1em;
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
          margin-top: 1em; /* 画像の上部に余白を追加 */
          margin-bottom: 1em; /* 画像の下部に余白を追加 */
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
          z-index: 10;
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
          z-index: 10;
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

        @media (max-width: 768px) {
          .markdown-editor {
            flex-direction: column;
          }
        }

        /* コードブロックのトークンスタイル */
        .token.code-block {
          color: #07a;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}

export default MarkdownEditor
