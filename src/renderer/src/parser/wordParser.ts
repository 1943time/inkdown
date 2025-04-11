import mammoth from 'mammoth'
import { htmlToMarkdown } from './htmlToMarkdown'

export interface WordParseResult {
  text: string
  html: string
  metadata: {
    title?: string
    author?: string
    lastModified?: string
  }
}

export class WordParser {
  /**
   * 从Word文件读取内容
   * @param file Word文件对象
   * @returns 解析结果，包含文本内容和元数据
   */
  public static async parseWord(file: File): Promise<WordParseResult> {
    try {
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // 解析Word文档，保留格式
      const result = await mammoth.convertToHtml({ arrayBuffer })
      
      return {
        text: result.value,
        html: result.value,
        metadata: {
          title: file.name,
          lastModified: new Date(file.lastModified).toISOString(),
        }
      }
    } catch (error: any) {
      throw new Error(`Word文档解析错误: ${error.message}`)
    }
  }

  /**
   * 完整的Word处理流程
   * @param file Word文件对象
   * @returns 处理后的文本 markdown格式
   */
  public static async processForLLM(file: File): Promise<string> {
    const { text } = await this.parseWord(file)
    return htmlToMarkdown(text)
  }
} 