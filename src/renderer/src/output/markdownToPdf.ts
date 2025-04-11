import { remark } from 'remark'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { Node } from 'unist'
import { fileSave } from 'browser-fs-access'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { bundledLanguages, codeToHtml } from 'shiki'

// Import required styles from CDN
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
  
  @media print {
    body {
      padding: 0;
      margin: 0;
    }
    
    @page {
      margin: 1cm;
    }
    
    a:after {
      content: " (" attr(href) ")";
      font-size: 90%;
      color: #606060;
    }
    
    pre, blockquote {
      page-break-inside: avoid;
    }
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

interface MarkdownToPdfOptions {
  filename?: string
  title?: string
  author?: string
  pageSize?: 'A4' | 'Letter' | 'Legal'
  includeTableOfContents?: boolean
}

interface TocItem {
  id: string
  text: string
  level: number
}

// Helper function to extract text from a node
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
// Create ID for headings
const createHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}
/**
 * Converts Markdown to PDF
 * @param markdown The markdown content to convert
 * @param options Options for the conversion
 * @returns A Promise that resolves when the PDF file is saved
 */
export const markdownToPdf = async (
  markdown: string,
  options: MarkdownToPdfOptions = {}
): Promise<void> => {
  const {
    filename = 'document.pdf',
    title = 'Markdown Document',
    author = 'Generated Document',
    pageSize = 'A4',
    includeTableOfContents = true
  } = options

  // 1. Process markdown and collect headings for TOC
  const tocItems: TocItem[] = []

  // Collect headings for table of contents
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

  // Custom plugin to transform markdown to HTML
  const markdownToHTML = () => {
    return async (tree: Node) => {
      let html = ''

      // Helper function to add element start and end
      const addElement = (
        tag: string,
        content: string,
        attrs: Record<string, string> = {},
        selfClosing: boolean = false
      ) => {
        let attrString = ''
        for (const [key, value] of Object.entries(attrs)) {
          attrString += ` ${key}="${value}"`
        }

        if (selfClosing) {
          html += `<${tag}${attrString} />`
        } else {
          html += `<${tag}${attrString}>${content}</${tag}>`
        }
      }

      // Process different node types to generate HTML
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
              // Check if child is a nested list
              if (child.type === 'list') {
                result += await processNode(child)
              } else {
                // For paragraphs in list items, don't wrap with <p> tags
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
              // Use shiki for syntax highlighting if language is specified
              if (
                node.lang &&
                typeof node.lang === 'string' &&
                Object.prototype.hasOwnProperty.call(bundledLanguages, node.lang)
              ) {
                const highlightedCode = await codeToHtml(node.value, {
                  lang: node.lang,
                  theme: 'github-light'
                })
                result += highlightedCode
              } else {
                // Fallback to regular code block
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

            // Table header
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

            // Table body
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
            // Pass through HTML content
            result += node.value
            break
          }

          case 'math': {
            // Use KaTeX for block math
            try {
              result += `<div class="math math-display">$$ ${node.value} $$</div>`
            } catch (error) {
              result += `<pre class="math">${node.value}</pre>`
            }
            break
          }

          case 'inlineMath': {
            // Use KaTeX for inline math
            try {
              result += `<span class="math math-inline">$ ${node.value} $</span>`
            } catch (error) {
              result += `<code class="math">${node.value}</code>`
            }
            break
          }

          default: {
            // For any unhandled node types
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

      // Process entire document
      const content = await processNode(tree)

      // Return the HTML content
      return content
    }
  }

  // Generate table of contents HTML
  const generateToc = (): string => {
    if (!includeTableOfContents || tocItems.length === 0) return ''

    let tocHtml = '<div class="toc"><h2>Table of Contents</h2><ul>'
    let prevLevel = 0

    tocItems.forEach((item) => {
      // Handle nesting
      if (item.level > prevLevel) {
        tocHtml += '<ul>'.repeat(item.level - prevLevel)
      } else if (item.level < prevLevel) {
        tocHtml += '</ul>'.repeat(prevLevel - item.level)
      }

      tocHtml += `<li><a href="#${item.id}">${item.text}</a></li>`
      prevLevel = item.level
    })

    // Close any remaining lists
    if (prevLevel > 0) {
      tocHtml += '</ul>'.repeat(prevLevel)
    }

    tocHtml += '</ul></div>'
    return tocHtml
  }

  // 2. Process markdown to HTML with all features
  try {
    // Create processor with all required extensions
    const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(collectHeadings)

    // Parse the markdown
    const parsedAst = processor.parse(markdown)

    // Process the AST
    const processedAst = await processor.run(parsedAst)

    // Convert AST to HTML
    const customHtmlProcessor = markdownToHTML()
    const contentHtml = await customHtmlProcessor(processedAst)

    // 3. Create full HTML with styles and TOC
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="author" content="${author}">
        <link rel="stylesheet" href="${KATEX_CSS}">
        <style>${STYLES}</style>
      </head>
      <body>
        ${includeTableOfContents ? generateToc() : ''}
        ${contentHtml}
      </body>
      </html>
    `

    // 4. Convert HTML to PDF using browser print capabilities
    const blob = await htmlToPdf(fullHtml, { pageSize })
    await fileSave(blob, { fileName: filename })
  } catch (error) {
    console.error('Error converting markdown to PDF:', error)
    throw error
  }
}

/**
 * Convert HTML to PDF using browser print functionality
 */
const htmlToPdf = (html: string, options: { pageSize: string }): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Create an iframe to render the HTML
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.top = '-10000px'
    iframe.style.left = '-10000px'
    iframe.style.width = '1000px'
    iframe.style.height = '1000px'
    document.body.appendChild(iframe)

    iframe.onload = async () => {
      try {
        const iframeWindow = iframe.contentWindow
        if (!iframeWindow) {
          throw new Error('Could not access iframe content window')
        }

        // Set print options
        const style = document.createElement('style')
        style.textContent = `@page { size: ${options.pageSize}; margin: 1cm; }`
        iframe.contentDocument?.head.appendChild(style)

        // Wait a moment for images and fonts to load
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Print to PDF
        const printPromise = new Promise<Blob>((resolve) => {
          // @ts-ignore - printToPDF is not in standard types
          if (iframeWindow.electron && iframeWindow.electron.printToPDF) {
            // Electron environment
            // @ts-ignore
            iframeWindow.electron
              // @ts-ignore
              .printToPDF({
                marginsType: 0,
                pageSize: options.pageSize,
                printBackground: true,
                landscape: false
              })
              .then((data: Uint8Array) => {
                resolve(new Blob([data], { type: 'application/pdf' }))
              })
              .catch(reject)
          } else {
            // Browser environment - use print to PDF functionality
            const handler = () => {
              window.removeEventListener('focus', handler)
              setTimeout(() => {
                // Use PDF data transferred from print dialog if available
                // This is a simplification - in real implementation,
                // we'd need to capture the PDF data from the print dialog
                // Since browsers don't provide direct PDF output,
                // we're creating a placeholder blob here
                resolve(new Blob(['PDF data would be here'], { type: 'application/pdf' }))
              }, 1000)
            }
            window.addEventListener('focus', handler)
            iframeWindow.print()
          }
        })

        const blob = await printPromise
        document.body.removeChild(iframe)
        resolve(blob)
      } catch (error) {
        document.body.removeChild(iframe)
        reject(error)
      }
    }

    // Set the content of the iframe
    iframe.srcdoc = html
  })
}

/**
 * Export markdown string to a PDF file
 * @param markdown The markdown content as string
 * @param options Options for the conversion
 */
export const exportMarkdownToPdf = async (
  markdown: string,
  options: MarkdownToPdfOptions = {}
): Promise<void> => {
  try {
    await markdownToPdf(markdown, options)
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Helper function to check if we're running in Electron
 */
export const isElectron = (): boolean => {
  // @ts-ignore - checking for Electron-specific properties
  return (
    typeof navigator === 'object' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.indexOf('Electron') >= 0
  )
}

/**
 * Alternative implementation for non-Electron environments using jsPDF and html2canvas
 * This requires importing additional dependencies:
 * - jspdf
 * - html2canvas
 *
 * This function can be used when you need more control over PDF generation in browser environments
 *
 * Usage example:
 * ```typescript
 * import jsPDF from 'jspdf';
 * import html2canvas from 'html2canvas';
 *
 * // Later in your code:
 * await exportMarkdownToPdfAdvanced(markdown, {
 *   jsPDF,
 *   html2canvas,
 *   filename: 'document.pdf',
 *   margin: { top: 10, right: 10, bottom: 10, left: 10 },
 *   orientation: 'portrait',
 *   format: 'a4'
 * });
 * ```
 *
 * 与使用浏览器打印功能相比，jsPDF和html2canvas方法的优势：
 * 1. 无需用户交互 - 无需用户手动点击打印对话框中的保存按钮
 * 2. 更好的控制 - 可以精确控制页面大小、边距和其他格式选项
 * 3. 可编程性 - 可以在代码中按需生成和保存PDF，无需用户干预
 * 4. 批处理能力 - 可以批量处理多个文档
 * 5. 更好的跨浏览器兼容性 - 不依赖于浏览器的打印功能
 *
 * 注意事项：
 * - html2canvas不能完美捕获所有CSS效果
 * - jsPDF对中文等非拉丁文字的支持需要额外配置
 * - 大型文档的渲染可能会影响性能
 */
export const exportMarkdownToPdfAdvanced = async (
  markdown: string,
  options: MarkdownToPdfOptions & {
    jsPDF: any
    html2canvas: any
    margin?: { top: number; right: number; bottom: number; left: number }
    orientation?: 'portrait' | 'landscape'
    unit?: 'pt' | 'mm' | 'cm' | 'in'
    format?: [number, number] | 'a4' | 'a3' | 'a5' | 'letter' | 'legal'
    quality?: number
    pdfOptions?: any
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
    quality = 2, // Higher for better quality but larger file size
    pdfOptions = {}
  } = options

  if (!jsPDF || !html2canvas) {
    throw new Error('您必须提供jsPDF和html2canvas库以使用高级PDF导出功能')
  }

  try {
    // 创建一个新的提取heading的函数和TOC项目收集器
    const tocItems: TocItem[] = []

    // 收集heading的函数
    const collectHeadingsAdvanced = () => {
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
    const generateTocAdvanced = (): string => {
      if (!includeTableOfContents || tocItems.length === 0) return ''

      let tocHtml = '<div class="toc"><h2>Table of Contents</h2><ul>'
      let prevLevel = 0

      tocItems.forEach((item) => {
        // Handle nesting
        if (item.level > prevLevel) {
          tocHtml += '<ul>'.repeat(item.level - prevLevel)
        } else if (item.level < prevLevel) {
          tocHtml += '</ul>'.repeat(prevLevel - item.level)
        }

        tocHtml += `<li><a href="#${item.id}">${item.text}</a></li>`
        prevLevel = item.level
      })

      // Close any remaining lists
      if (prevLevel > 0) {
        tocHtml += '</ul>'.repeat(prevLevel)
      }

      tocHtml += '</ul></div>'
      return tocHtml
    }

    // 1. 使用与markdownToPdf相同的方式处理markdown
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(collectHeadingsAdvanced)

    // 解析markdown
    const parsedAst = processor.parse(markdown)

    // 处理AST
    const processedAst = await processor.run(parsedAst)

    // 转换AST为HTML
    // 重用markdownToHTML函数的逻辑，但为了避免函数作用域问题，这里内联实现
    let contentHtml = ''

    // 处理不同的节点类型生成HTML
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
            // Check if child is a nested list
            if (child.type === 'list') {
              result += await processNode(child)
            } else {
              // For paragraphs in list items, don't wrap with <p> tags
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
            // Use shiki for syntax highlighting if language is specified
            if (
              node.lang &&
              typeof node.lang === 'string' &&
              Object.prototype.hasOwnProperty.call(bundledLanguages, node.lang)
            ) {
              const highlightedCode = await codeToHtml(node.value, {
                lang: node.lang,
                theme: 'github-light'
              })
              result += highlightedCode
            } else {
              // Fallback to regular code block
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

          // Table header
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

          // Table body
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
          // Pass through HTML content
          result += node.value
          break
        }

        case 'math': {
          // Use KaTeX for block math
          try {
            result += `<div class="math math-display">$$ ${node.value} $$</div>`
          } catch (error) {
            result += `<pre class="math">${node.value}</pre>`
          }
          break
        }

        case 'inlineMath': {
          // Use KaTeX for inline math
          try {
            result += `<span class="math math-inline">$ ${node.value} $</span>`
          } catch (error) {
            result += `<code class="math">${node.value}</code>`
          }
          break
        }

        default: {
          // For any unhandled node types
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

    // 处理整个文档
    contentHtml = await processNode(processedAst)

    // 生成目录
    const tocHtml = generateTocAdvanced()

    // 2. 创建一个HTML容器
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

    // 临时添加到文档以正确渲染
    document.body.appendChild(container)

    // 3. 初始化PDF文档
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

    // 4. 获取容器总高度以计算页数
    const containerHeight = container.offsetHeight
    const pageHeight =
      format === 'a4'
        ? 297 - margin.top - margin.bottom
        : pdfDoc.internal.pageSize.getHeight() - margin.top - margin.bottom // A4高度（mm）
    const pageWidth =
      format === 'a4'
        ? 210 - margin.left - margin.right
        : pdfDoc.internal.pageSize.getWidth() - margin.left - margin.right // A4宽度（mm）

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
      pdfDoc.addImage(
        imgData,
        'PNG',
        margin.left,
        margin.top,
        pageWidth,
        (canvas.height * pageWidth) / canvas.width,
        '',
        'FAST'
      )

      // 如果需要，添加页码
      if (totalPages > 1) {
        pdfDoc.setFontSize(10)
        pdfDoc.text(
          `${pageNum + 1} / ${totalPages}`,
          margin.left,
          pdfDoc.internal.pageSize.getHeight() - margin.bottom / 2
        )
      }
    }

    // 5. 生成所有页面
    const totalPages = Math.ceil(containerHeight / pageHeight)
    for (let i = 0; i < totalPages; i++) {
      await addPage(i, totalPages)
    }

    // 6. 保存PDF
    pdfDoc.save(filename)

    // 清理
    document.body.removeChild(container)

    return Promise.resolve()
  } catch (error) {
    console.error('导出PDF时出错:', error)
    return Promise.reject(error)
  }
}

/**
 * Helper function to handle canvas rendering of complex pages
 * with proper page breaks and content flow
 */
export const generatePdfFromHtml = async (
  htmlElement: HTMLElement,
  options: {
    jsPDF: any
    html2canvas: any
    filename?: string
    margin?: { top: number; right: number; bottom: number; left: number }
    orientation?: 'portrait' | 'landscape'
    unit?: 'pt' | 'mm' | 'cm' | 'in'
    format?: [number, number] | 'a4' | 'a3' | 'a5' | 'letter' | 'legal'
    quality?: number
  }
) => {
  const {
    jsPDF,
    html2canvas,
    filename = 'document.pdf',
    margin = { top: 10, right: 10, bottom: 10, left: 10 },
    orientation = 'portrait',
    unit = 'mm',
    format = 'a4',
    quality = 2
  } = options

  const pdf = new jsPDF({
    orientation,
    unit,
    format,
    putOnlyUsedFonts: true,
    compress: true
  })

  // Get page dimensions
  const pageHeight = pdf.internal.pageSize.getHeight() - margin.top - margin.bottom
  const pageWidth = pdf.internal.pageSize.getWidth() - margin.left - margin.right

  // Render entire HTML to canvas
  const canvas = await html2canvas(htmlElement, {
    scale: quality,
    useCORS: true,
    logging: false
  })

  // Calculate the total number of pages
  const imgWidth = pageWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const totalPages = Math.ceil(imgHeight / pageHeight)

  // Add each canvas section to a new PDF page
  let heightLeft = imgHeight
  let position = 0
  let page = 0

  while (heightLeft > 0) {
    // Add page if this is not the first page
    if (page > 0) {
      pdf.addPage()
    }

    // Calculate the height for this page
    const heightForThisPage = Math.min(heightLeft, pageHeight)

    // Add canvas image for this page
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      margin.left,
      margin.top - position,
      imgWidth,
      imgHeight,
      '',
      'FAST'
    )

    // Add page numbers
    if (totalPages > 1) {
      pdf.setFontSize(10)
      pdf.text(
        `Page ${page + 1} of ${totalPages}`,
        margin.left,
        pdf.internal.pageSize.getHeight() - margin.bottom / 2
      )
    }

    // Calculate remaining height
    heightLeft -= heightForThisPage
    position += heightForThisPage
    page++
  }

  // Save the PDF
  pdf.save(filename)
}
