/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = text

    // 设置样式使其不可见
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)

    // 选择文本
    textArea.focus()
    textArea.select()

    try {
      // 尝试使用 document.execCommand
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}

/**
 * 从剪贴板读取文本
 * @returns Promise<string> 剪贴板中的文本
 */
export async function readFromClipboard(): Promise<string> {
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText()
    }

    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()

    try {
      // 尝试使用 document.execCommand
      const success = document.execCommand('paste')
      document.body.removeChild(textArea)
      return success ? textArea.value : ''
    } catch (err) {
      document.body.removeChild(textArea)
      return ''
    }
  } catch (err) {
    console.error('读取剪贴板失败:', err)
    return ''
  }
}

/**
 * 检查浏览器是否支持剪贴板操作
 * @returns boolean 是否支持
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard || document.execCommand)
}

/**
 * 复制富文本到剪贴板
 * @param html 要复制的HTML内容
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyRichTextToClipboard(html: string): Promise<boolean> {
  console.log('copyRichTextToClipboard', html)
  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      const blob = new Blob([html], { type: 'text/html' })
      const data = new ClipboardItem({
        'text/html': blob
      })
      await navigator.clipboard.write([data])
      return true
    }

    // 降级方案：使用传统方法
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'fixed'
    container.style.left = '-999999px'
    container.style.top = '-999999px'
    container.style.opacity = '0'

    document.body.appendChild(container)

    const range = document.createRange()
    range.selectNodeContents(container)

    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    try {
      const success = document.execCommand('copy')
      document.body.removeChild(container)
      return success
    } catch (err) {
      document.body.removeChild(container)
      return false
    }
  } catch (err) {
    console.error('复制富文本失败:', err)
    return false
  }
}
