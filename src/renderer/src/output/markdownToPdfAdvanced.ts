/**
 * 这个文件提供了使用jsPDF和html2canvas库导出Markdown为PDF的实现
 * 该实现不依赖于浏览器的打印功能，可以直接生成PDF并保存
 */

import { remark } from 'remark'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { Node } from 'unist'
import { bundledLanguages, codeToHtml } from 'shiki'

// 引入CSS样式和常量
const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css'
const STYLES = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    color: #24292e;
    max-width: 800px;
    margin: 0 auto;
    padding: 2em;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    page-break-after: avoid;
  }
  
  h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  
  p, ul, ol, blockquote, pre, table {
    margin-top: 0;
    margin-bottom: 16px;
  }
  
  ul, ol {
    padding-left: 2em;
  }
  
  ul ul, ul ol, ol ul, ol ol {
    margin-top: 0;
    margin-bottom: 0;
  }
  
  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0;
  }
  
  pre {
    background-color: #f6f8fa;
    border-radius: 3px;
    padding: 16px;
    overflow: auto;
  }
  
  code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 85%;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
    padding: 0.2em 0.4em;
  }
  
  pre code {
    background-color: transparent;
    padding: 0;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
  }
  
  table th, table td {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
  }
  
  table th {
    background-color: #f6f8fa;
    font-weight: 600;
  }
  
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em 0;
  }
  
  hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }
  
  .task-list-item {
    list-style-type: none;
  }
  
  .task-list-item-checkbox {
    margin-right: 0.5em;
  }
  
  .toc {
    background-color: #f6f8fa;
    padding: 1em;
    margin-bottom: 1em;
    border-radius: 3px;
  }
  
  .toc ul {
    list-style-type: none;
    padding-left: 1em;
  }
  
  .toc li {
    margin-bottom: 0.5em;
  }
  
  .toc a {
    text-decoration: none;
    color: #0366d6;
  }
`

// 接口定义
interface TocItem {
  id: string
  text: string
  level: number
}

interface MarkdownToPdfOptions {
  filename?: string
  title?: string
  author?: string
  includeTableOfContents?: boolean
  margin?: { top: number; right: number; bottom: number; left: number }
  orientation?: 'portrait' | 'landscape'
  unit?: 'pt' | 'mm' | 'cm' | 'in'
  format?: [number, number] | 'a4' | 'a3' | 'a5' | 'letter' | 'legal'
  quality?: number
  pdfOptions?: any
}

/**
 * 使用jsPDF和html2canvas将Markdown导出为PDF
 *
 * 与使用浏览器打印功能相比，此方法的优势：
 * 1. 无需用户交互 - 无需用户手动点击打印对话框中的保存按钮
 * 2. 更好的控制 - 可以精确控制页面大小、边距和其他格式选项
 * 3. 可编程性 - 可以在代码中按需生成和保存PDF，无需用户干预
 * 4. 批处理能力 - 可以批量处理多个文档
 * 5. 更好的跨浏览器兼容性 - 不依赖于浏览器的打印功能
 *
 * @param markdown Markdown内容
 * @param options 导出选项，必须包含jsPDF和html2canvas库的实例
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * import jsPDF from 'jspdf';
 * import html2canvas from 'html2canvas';
 *
 * // 在代码中调用:
 * await exportMarkdownToPdf(markdown, {
 *   jsPDF,
 *   html2canvas,
 *   filename: 'document.pdf',
 *   title: '我的文档',
 *   author: '作者名称',
 *   includeTableOfContents: true,
 *   margin: { top: 10, right: 10, bottom: 10, left: 10 },
 *   orientation: 'portrait',
 *   format: 'a4'
 * });
 * ```
 */
export const exportMarkdownToPdf = async (
  markdown: string,
  options: MarkdownToPdfOptions & {
    jsPDF: any
    html2canvas: any
  }
): Promise<void> => {
  const {
    jsPDF,
    html2canvas,
    filename = 'document.pdf',
    title = 'Markdown Document',
    author = 'Generated Document',
    includeTableOfContents = true,
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    orientation = 'portrait',
    unit = 'mm',
    format = 'a4',
    quality = 2,
    pdfOptions = {}
  } = options

  if (!jsPDF || !html2canvas) {
    throw new Error('您必须提供jsPDF和html2canvas库以使用PDF导出功能')
  }

  try {
    // 收集目录项
    const tocItems: TocItem[] = []

    // 辅助函数：创建标题ID
    const createHeadingId = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
    }

    // 辅助函数：提取节点文本
    const getNodeText = (node: any): string => {
      let text = ''

      if (node.value) {
        return node.value
      }

      if (node.children) {
        for (const child of node.children) {
          text += getNodeText(child)
        }
      }

      return text
    }

    // 收集目录项的remark插件
    const collectHeadings = () => {
      return (tree: Node) => {
        visit(tree, 'heading', (node: any) => {
          const text = getNodeText(node)
          const id = createHeadingId(text)
          tocItems.push({
            id,
            text,
            level: node.depth
          })
        })
      }
    }

    // 生成目录HTML
    const generateToc = (): string => {
      if (!includeTableOfContents || tocItems.length === 0) return ''

      let tocHtml = '<div class="toc"><h2>Table of Contents</h2><ul>'
      let prevLevel = 0

      tocItems.forEach((item) => {
        // 处理嵌套
        if (item.level > prevLevel) {
          tocHtml += '<ul>'.repeat(item.level - prevLevel)
        } else if (item.level < prevLevel) {
          tocHtml += '</ul>'.repeat(prevLevel - item.level)
        }

        tocHtml += `<li><a href="#${item.id}">${item.text}</a></li>`
        prevLevel = item.level
      })

      // 关闭剩余的列表
      if (prevLevel > 0) {
        tocHtml += '</ul>'.repeat(prevLevel)
      }

      tocHtml += '</ul></div>'
      return tocHtml
    }

    // 将markdown节点转换为HTML
    const processNode = async (node: any): Promise<string> => {
      let result = ''

      switch (node.type) {
        case 'root': {
          for (const child of node.children) {
            result += await processNode(child)
          }
          break
        }

        case 'heading': {
          const headingId = createHeadingId(getNodeText(node))
          result += `<h${node.depth} id="${headingId}">`
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += `</h${node.depth}>`
          break
        }

        case 'paragraph': {
          result += '<p>'
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</p>'
          break
        }

        case 'text': {
          result += node.value
          break
        }

        case 'strong': {
          result += '<strong>'
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</strong>'
          break
        }

        case 'emphasis': {
          result += '<em>'
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</em>'
          break
        }

        case 'delete': {
          result += '<del>'
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</del>'
          break
        }

        case 'link': {
          result += `<a href="${node.url}">`
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</a>'
          break
        }

        case 'image': {
          result += `<img src="${node.url}" alt="${node.alt || ''}" />`
          break
        }

        case 'list': {
          const listTag = node.ordered ? 'ol' : 'ul'
          result += `<${listTag}>`
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += `</${listTag}>`
          break
        }

        case 'listItem': {
          result += '<li>'
          for (const child of node.children) {
            // 处理嵌套列表
            if (child.type === 'list') {
              result += await processNode(child)
            } else {
              // 对于列表项中的段落，不要用<p>标签包装
              if (child.type === 'paragraph') {
                for (const paragraphChild of child.children) {
                  result += await processNode(paragraphChild)
                }
              } else {
                result += await processNode(child)
              }
            }
          }
          result += '</li>'
          break
        }

        case 'inlineCode': {
          result += `<code>${node.value}</code>`
          break
        }

        case 'code': {
          try {
            // 使用shiki进行语法高亮
            if (node.lang && typeof node.lang === 'string' && Object.prototype.hasOwnProperty.call(bundledLanguages, node.lang)) {
              const highlightedCode = await codeToHtml(node.value, {
                lang: node.lang,
                theme: 'github-light'
              })
              result += highlightedCode
            } else {
              // 回退到普通代码块
              result += `<pre><code>${node.value}</code></pre>`
            }
          } catch (error) {
            result += `<pre><code>${node.value}</code></pre>`
          }
          break
        }

        case 'blockquote': {
          result += '<blockquote>'
          for (const child of node.children) {
            result += await processNode(child)
          }
          result += '</blockquote>'
          break
        }

        case 'table': {
          result += '<table>'

          // 表头
          if (node.children.length > 0) {
            result += '<thead><tr>'
            const headerRow = node.children[0]
            for (const cell of headerRow.children) {
              result += '<th>'
              for (const child of cell.children) {
                result += await processNode(child)
              }
              result += '</th>'
            }
            result += '</tr></thead>'
          }

          // 表体
          if (node.children.length > 1) {
            result += '<tbody>'
            for (let i = 1; i < node.children.length; i++) {
              const row = node.children[i]
              result += '<tr>'
              for (const cell of row.children) {
                result += '<td>'
                for (const child of cell.children) {
                  result += await processNode(child)
                }
                result += '</td>'
              }
              result += '</tr>'
            }
            result += '</tbody>'
          }

          result += '</table>'
          break
        }

        case 'html': {
          // 直接传递HTML内容
          result += node.value
          break
        }

        case 'math': {
          // 使用KaTeX处理数学公式块
          try {
            result += `<div class="math math-display">$$ ${node.value} $$</div>`
          } catch (error) {
            result += `<pre class="math">${node.value}</pre>`
          }
          break
        }

        case 'inlineMath': {
          // 使用KaTeX处理行内数学公式
          try {
            result += `<span class="math math-inline">$ ${node.value} $</span>`
          } catch (error) {
            result += `<code class="math">${node.value}</code>`
          }
          break
        }

        default: {
          // 处理任何未处理的节点类型
          if (node.children) {
            for (const child of node.children) {
              result += await processNode(child)
            }
          } else if (node.value) {
            result += node.value
          }
          break
        }
      }

      return result
    }

    // 处理Markdown
    const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(collectHeadings)

    // 解析Markdown
    const parsedAst = processor.parse(markdown)

    // 处理AST
    const processedAst = await processor.run(parsedAst)

    // 转换为HTML
    const contentHtml = await processNode(processedAst)

    // 生成目录
    const tocHtml = generateToc()

    // 创建HTML容器
    const container = document.createElement('div')
    container.innerHTML = `
      <style>${STYLES}</style>
      <link rel="stylesheet" href="${KATEX_CSS}">
      ${tocHtml}
      ${contentHtml}
    `
    container.style.width = format === 'a4' ? '210mm' : '100%'
    container.style.padding = '20px'
    container.style.boxSizing = 'border-box'

    // 临时附加到文档以正确渲染
    document.body.appendChild(container)

    // 初始化PDF文档
    const pdfDoc = new jsPDF({
      orientation,
      unit,
      format,
      ...pdfOptions,
      putOnlyUsedFonts: true,
      compress: true
    })

    // 设置文档属性
    pdfDoc.setProperties({
      title,
      author,
      subject: 'Markdown Document',
      creator: 'Markdown to PDF Converter'
    })

    // 获取容器总高度以计算页数
    const containerHeight = container.offsetHeight
    const pageHeight = format === 'a4' ? 297 - margin.top - margin.bottom : pdfDoc.internal.pageSize.getHeight() - margin.top - margin.bottom // A4高度（mm）
    const pageWidth = format === 'a4' ? 210 - margin.left - margin.right : pdfDoc.internal.pageSize.getWidth() - margin.left - margin.right // A4宽度（mm）

    // 添加页面到PDF的函数
    const addPage = async (pageNum: number, totalPages: number) => {
      if (pageNum > 0) {
        pdfDoc.addPage()
      }

      // 计算要渲染的容器部分
      const yStart = pageNum * pageHeight
      const remainingHeight = containerHeight - yStart
      const currentPageHeight = Math.min(pageHeight, remainingHeight)

      if (currentPageHeight <= 0) return

      // 使用html2canvas渲染页面的特定部分
      const canvas = await html2canvas(container, {
        y: yStart,
        height: currentPageHeight,
        scale: quality,
        useCORS: true, // 允许加载其他域的图片
        logging: false,
        windowWidth: container.scrollWidth
      })

      // 将canvas转换为图像并添加到PDF
      const imgData = canvas.toDataURL('image/png')
      pdfDoc.addImage(imgData, 'PNG', margin.left, margin.top, pageWidth, (canvas.height * pageWidth) / canvas.width, '', 'FAST')

      // 如果需要，添加页码
      if (totalPages > 1) {
        pdfDoc.setFontSize(10)
        pdfDoc.text(`${pageNum + 1} / ${totalPages}`, margin.left, pdfDoc.internal.pageSize.getHeight() - margin.bottom / 2)
      }
    }

    // 生成所有页面
    const totalPages = Math.ceil(containerHeight / pageHeight)
    for (let i = 0; i < totalPages; i++) {
      await addPage(i, totalPages)
    }

    // 保存PDF
    pdfDoc.save(filename)

    // 清理
    document.body.removeChild(container)

    return Promise.resolve()
  } catch (error) {
    console.error('导出PDF时出错:', error)
    return Promise.reject(error)
  }
}
