import { remark } from 'remark'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { Node } from 'unist'
import { bundledLanguages, codeToHtml } from 'shiki'

// Helper function to extract text from a node
const getNodeText = (node: any): string => {
  let text = ''
  if (node.value) return node.value
  if (node.children) {
    for (const child of node.children) {
      text += getNodeText(child)
    }
  }
  return text
}

/**
 * Convert Markdown to HTML without any styling
 * @param markdown The markdown content to convert
 * @returns Promise<string> The converted HTML
 */
export const markdownToHtml = async (markdown: string): Promise<string> => {
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
        result += `<h${node.depth}>`
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
        result += `<a href="${node.url}"${node.title ? ` title="${node.title}"` : ''}>`
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += '</a>'
        break
      }

      case 'image': {
        result += `<img src="${node.url}" alt="${node.alt || ''}"${
          node.title ? ` title="${node.title}"` : ''
        }>`
        break
      }

      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul'
        result += `<${tag}${node.start ? ` start="${node.start}"` : ''}>`
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += `</${tag}>`
        break
      }

      case 'listItem': {
        result += '<li>'
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += '</li>'
        break
      }

      case 'table': {
        result += '<table>'
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += '</table>'
        break
      }

      case 'tableRow': {
        result += '<tr>'
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += '</tr>'
        break
      }

      case 'tableCell': {
        const tag = node.isHeader ? 'th' : 'td'
        result += `<${tag}${node.align ? ` align="${node.align}"` : ''}>`
        for (const child of node.children) {
          result += await processNode(child)
        }
        result += `</${tag}>`
        break
      }

      case 'code': {
        try {
          if (node.lang && typeof node.lang === 'string' && Object.prototype.hasOwnProperty.call(bundledLanguages, node.lang)) {
            const highlightedCode = await codeToHtml(node.value, {
              lang: node.lang,
              theme: 'github-light'
            })
            result += highlightedCode
          } else {
            result += `<pre><code>${node.value}</code></pre>`
          }
        } catch (error) {
          result += `<pre><code>${node.value}</code></pre>`
        }
        break
      }

      case 'inlineCode': {
        result += `<code>${node.value}</code>`
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

      case 'html': {
        result += node.value
        break
      }

      case 'thematicBreak': {
        result += '<hr>'
        break
      }

      case 'break': {
        result += '<br>'
        break
      }

      case 'math': {
        // 处理数学公式块 ($$...$$)
        result += `<div class="math">$$${node.value}$$</div>`
        break
      }

      case 'inlineMath': {
        // 处理行内数学公式 ($...$)
        result += `<span class="math">$${node.value}$</span>`
        break
      }

      default: {
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

  try {
    // Create processor with GFM and Math support
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)

    // Parse markdown
    const parsedAst = processor.parse(markdown)

    // Process AST
    const processedAst = await processor.run(parsedAst)

    // Convert to HTML
    const html = await processNode(processedAst)
    
    return html
  } catch (error) {
    console.error('Error converting markdown to HTML:', error)
    throw error
  }
}

/**
 * Export markdown string to HTML
 * @param markdown The markdown content as string
 * @returns Promise<string> The HTML content
 */
export const exportMarkdownToHtml = async (markdown: string): Promise<string> => {
  try {
    return await markdownToHtml(markdown)
  } catch (error) {
    return Promise.reject(error)
  }
}
