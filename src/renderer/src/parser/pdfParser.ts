import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
// 设置 PDF.js worker
GlobalWorkerOptions.workerSrc = pdfWorker
// 设置 PDF.js worker 路径

export interface PDFParseResult {
  text: string
  metadata: {
    pageCount: number
    title?: string
    author?: string
  }
}

export class PDFParser {
  /**
   * 从PDF文件读取内容
   * @param file PDF文件对象
   * @returns 解析结果，包含文本内容和元数据
   */
  public static async parsePDF(file: File): Promise<PDFParseResult> {
    try {
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // 加载PDF文档
      const loadingTask = getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      // 获取元数据
      const metadata = await pdf.getMetadata()

      // 提取所有页面的文本
      const textContent: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        
        // 按行处理文本，保持格式
        let currentLine = ''
        let lastY = null
        let lastFontSize = null
        
        for (const item of content.items) {
          // @ts-ignore
          const { str, transform, fontName, fontSize } = item
          const [, , x, y] = transform
          
          // 检测新行
          if (lastY !== null && Math.abs(y - lastY) > 5) {
            if (currentLine.trim()) {
              textContent.push(currentLine.trim())
              currentLine = ''
            }
          }
          
          // 检测标题（基于字体大小）
          if (lastFontSize !== null && fontSize > lastFontSize * 1.2) {
            if (currentLine.trim()) {
              textContent.push(currentLine.trim())
              currentLine = ''
            }
            currentLine = `# ${str} `
          } else {
            currentLine += str + ' '
          }
          
          lastY = y
          lastFontSize = fontSize
        }

        // 添加最后一行
        if (currentLine.trim()) {
          textContent.push(currentLine.trim())
        }

        // 添加页面分隔符
        if (textContent.length > 0) {
          textContent.push('\n---\n')
        }
      }

      return {
        text: textContent.join('\n'),
        metadata: {
          pageCount: pdf.numPages,
          // @ts-ignore
          title: metadata.info?.Title,
          // @ts-ignore
          author: metadata.info?.Author,
        }
      }
    } catch (error: any) {
      throw new Error(`PDF解析错误: ${error.message}`)
    }
  }

  /**
   * 将PDF内容处理成适合大模型使用的格式
   * @param text PDF原始文本
   * @returns 处理后的文本
   */
  public static formatForLLM(text: string): string {
    return text
      .trim()
      // 移除多余的空白行，但保留段落间的空行
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // 规范化空格
      .replace(/\s+/g, ' ')
      // 处理列表项
      .replace(/^(\s*)[•-]\s/gm, '$1- ')
      // 处理数字列表
      .replace(/^(\s*)\d+\.\s/gm, '$11. ')
      // 处理标题层级
      .replace(/^#\s+/gm, '# ')
      // 移除特殊字符，但保留基本的标点符号
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9.,!?;:'"()\s#-]/g, '')
  }

  /**
   * 完整的PDF处理流程
   * @param file PDF文件对象
   * @returns 处理后的文本
   */
  public static async processForLLM(file: File): Promise<string> {
    const { text } = await this.parsePDF(file)
    return this.formatForLLM(text)
  }
}