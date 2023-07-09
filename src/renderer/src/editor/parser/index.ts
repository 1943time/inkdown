import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import {Element} from 'slate'
import fs from 'fs'
import {Content, Table, List} from 'mdast'
import {CustomLeaf, Elements, MediaNode, TableNode} from '../../el'

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath, {singleDollarTextMath: false})

const parseText = (els: Content[], leaf: CustomLeaf = {}) => {
  let leafs: CustomLeaf[] = []
  for (let n of els) {
    if (n.type === 'strong') leafs = leafs.concat(parseText(n.children, {...leaf, bold: true}))
    if (n.type === 'emphasis') leafs = leafs.concat(parseText(n.children, {...leaf, italic: true}))
    if (n.type === 'delete') leafs = leafs.concat(parseText(n.children, {...leaf, strikethrough: true}))
    if (n.type === 'link') leafs = leafs.concat(parseText(n.children, {...leaf, url: n.url}))
    if (n.type === 'text') {
      leafs.push({...leaf, text: n.value})
    }
    if (n.type === 'inlineCode') leafs.push({...leaf, text: n.value, code: true})
  }
  return leafs
}

const parseTable = (table: Table) => {
  const aligns = table.align
  const node:TableNode = {
    type: 'table',
    children: table.children.map((r, l) => {
      return {
        type: 'table-row',
        children: r.children.map((c, i) => {
          return {
            type: 'table-cell',
            align: aligns?.[i] || undefined,
            title: l === 0,
            children: c.children?.length ? parserBlock(c.children) : [{text: ''}]
          }
        })
      }
    })
  }
  return node
}
const parserBlock = (nodes: Content[], top = false) => {
  let els:(Elements | Text) [] = []
  let el:Element | null | Element[] = null
  let preNode:null | Content = null
  for (let n of nodes) {
    switch (n.type) {
      case 'heading':
        el = {type: 'head', level: n.depth, children: parserBlock(n.children)}
        break
      case 'html':
        el = {text: n.value}
        break
      case 'image':
        el = {type: 'media', children: [{text: ''}], url: decodeURIComponent(n.url), alt: n.alt} as MediaNode
        break
      case 'list':
        el = {type: 'list', order: n.ordered, children: parserBlock(n.children)}
        break
      case 'listItem':
        el = {type: 'list-item', checked: n.checked, children: n.children?.length ? parserBlock(n.children) : [{type: 'paragraph', children: [{text: ''}]}]}
        break
      case 'paragraph':
        el = {type: 'paragraph', children: parserBlock(n.children)}
        break
      case 'inlineCode':
        el = {text:n.value, code: true}
        break
      case 'thematicBreak':
        el = {type: 'hr', children: [{text: ''}]}
        break
      case 'code':
        el = {
          type: 'code', language: n.lang, render: n.meta === 'render',
          children: n.value.split('\n').map(s => {
            return {
              type: 'code-line',
              children: [{text: s}]
            }
          })
        }
        break
      case 'math':
        el = {
          type: 'code', language: 'latex', katex: true,
          children: n.value.split('\n').map(s => {
            return {
              type: 'code-line',
              children: [{text: s}]
            }
          })
        }
        break
      case 'blockquote':
        el = {type: 'blockquote', children: parserBlock(n.children)}
        break
      case 'table':
        el = parseTable(n)
        break
      default:
        if (['strong', 'link', 'text', 'emphasis', 'delete', 'inlineCode'].includes(n.type)) {
          if (n.type === 'text') {
            el = {text: n.value}
          } else {
            const leaf:CustomLeaf = {}
            if (n.type === 'strong') leaf.bold = true
            if (n.type === 'emphasis') leaf.italic = true
            if (n.type === 'delete') leaf.strikethrough = true
            if (n.type === 'link') leaf.url = decodeURIComponent(n.url)
            // @ts-ignore
            el = parseText(n.children, leaf)
          }
        }
    }

    if (preNode && top) {
      const distance = (n.position?.start.line || 0) - (preNode.position?.end.line || 0)
      if (distance >= 4) {
        const lines = Math.floor((distance - 2) / 2)
        Array.from(new Array(lines)).forEach(() => {
          els.push({type: 'paragraph', children: [{text: ''}]})
        })
      }
    }

    if (el) {
      el instanceof Array ? els.push(...el) : els.push(el)
    }

    preNode = n
    el = null
  }
  return els
}
export const markdownParser = (filePath: string) => {
  const mdStr = fs.readFileSync(filePath, {encoding: 'utf-8'})
  const root = parser.parse(mdStr)
  return {schema: parserBlock(root.children, true), nodes: root.children}
}
