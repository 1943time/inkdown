import { remark } from 'remark'
import remarkBreaks from 'remark-breaks'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkHtml from 'remark-html'

/**
 * 将 Markdown 字符串转换为纯粹的 HTML 字符串。
 *
 * @param {string} markdown - 输入的 Markdown 字符串。
 * @returns {Promise<string>} 包含 HTML 内容的 Promise。
 */
export async function markdownToPureHtml(markdown: string) {
  const result = await remark()
    .use(remarkFrontmatter) // 支持 YAML/TOML 前置数据
    .use(remarkGfm) // 支持 GitHub Flavored Markdown (表格, 任务列表, 删除线等)
    .use(remarkBreaks) // 将硬换行符 (两个空格) 转换为 <br>
    .use(remarkMath) // 支持数学公式 (需要结合 MathJax 或 KaTeX 进行渲染)
    .use(remarkHtml, { sanitize: false }) // 将 AST 转换为 HTML。sanitize: false 表示不清理 HTML，通常在已知输入安全时使用。
    .process(markdown)
  return String(result)
}

export function getPlainTextWithBlockBreaks(htmlString: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlString, 'text/html')
  const body = doc.body // 通常我们只关心 body 里的内容

  let plainText = ''

  // 定义常见的块级元素标签
  const blockElements = new Set([
    'address',
    'article',
    'aside',
    'blockquote',
    'canvas',
    'dd',
    'div',
    'dl',
    'dt',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hr',
    'li',
    'main',
    'nav',
    'noscript',
    'ol',
    'p',
    'pre',
    'section',
    'table',
    'tfoot',
    'ul',
    'video',
    // 更多可能需要换行的元素，例如：
    'br' // br 标签也通常表示换行
  ])

  function traverseNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 文本节点直接添加其内容
      plainText += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // 元素节点
      const tagName = node.tagName.toLowerCase()

      // 遍历子节点
      for (const child of node.childNodes) {
        traverseNodes(child)
      }

      // 如果是块级元素，在其内容后面添加换行
      if (blockElements.has(tagName)) {
        // 避免连续的多个换行，例如 <p>Text</p><p>More Text</p> 会有两个换行
        // 这里简单处理为只添加一个换行，如果前一个字符不是换行符的话
        if (plainText.length > 0 && plainText[plainText.length - 1] !== '\n') {
          plainText += '\n'
        }
      }
    }
    // 忽略注释节点、文档类型节点等
  }

  traverseNodes(body) // 从 body 开始遍历

  // 最后清理一下，移除开头的空行和末尾多余的换行
  return plainText.trim()
}
