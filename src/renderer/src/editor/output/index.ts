import {Node, Text} from 'slate'
import {TableNode} from '../../el'
import stringWidth from 'string-width'
import {EditorUtils} from '../utils/editorUtils'
const space = '  '

const cache = new WeakMap<object, string>()
export const isMix = (t: Text) => {
  return Object.keys(t).filter(key => ['bold', 'code', 'italic', 'strikethrough'].includes(key)).length > 1
}
const textStyle = (t: Text) => {
  if (!t.text) return ''
  let str = t.text.replace(/(?<!\\)\\/g, '\\')
  let preStr = '', afterStr = ''
  if (t.code || t.bold || t.strikethrough || t.italic) {
    preStr = str.match(/^\s+/)?.[0] || ''
    afterStr = str.match(/\s+$/)?.[0] || ''
    str = str.trim()
  }
  if (t.code) str = `\`${str}\``
  if (t.italic) str = `*${str}*`
  if (t.bold) str = `**${str}**`
  if (t.strikethrough) str = `~~${str}~~`
  return `${preStr}${str}${afterStr}`
}
const composeText = (t: Text, parent: any[]) => {
  const siblings = parent[parent.length -1]?.children
  const index = siblings?.findIndex(n => n === t)
  if (!t.text) return ''
  let str = textStyle(t)
  if (t.url) {
    str = `[${str}](${encodeURI(t.url)})`
  } else if (isMix(t) && index !== -1) {
    const next = siblings[index + 1]
    if (!str.endsWith(' ') && next && !Node.string(next).startsWith(' ')) {
      str += ' '
    }
  }
  return str
}
const table = (el: TableNode, preString = '', parent: any[]) => {
  const children = el.children
  const head = children[0]?.children
  if (!children.length || !head.length) return ''
  let data: string[][] = []
  for (let c of children) {
    const row:string[] = []
    if (c.type === 'table-row') {
      for (let n of c.children) {
        if (n.type === 'table-cell') {
          row.push(toMarkdown(n.children, '', [...parent, n]))
        }
      }
    }
    data.push(row)
  }
  let output = '', colLength = new Map<number, number>()
  for (let i = 0; i < data[0].length; i++) {
    colLength.set(i, data.map(d => stringWidth(d[i])).sort((a, b) => b - a)[0])
  }
  for (let i = 0; i < data.length; i++) {
    let cells:string[] = []
    for (let j = 0; j < data[i].length; j++) {
      let str = data[i][j]
      const strLength = stringWidth(str)
      const length = colLength.get(j) || 2
      if (length > strLength) {
        if (head[j].align === 'right') {
          str = ' '.repeat(length - strLength) + str
        } else if (head[j].align === 'center') {
          const spaceLength = length - strLength
           const pre = Math.floor(spaceLength / 2)
          if (pre > 0) str = ' '.repeat(pre) + str
          const next = spaceLength - pre
          if (next > 0) str = str + ' '.repeat(next)
        } else {
          str += ' '.repeat(length - strLength)
        }
      }
      str = str.replace(/\|/g, '\\|')
      cells.push(str)
    }
    output += `${preString}| ${cells.join(' | ')} |`
    if (i !== data.length - 1 || data.length === 1) output += '\n'
    if (i === 0) {
      output += `${preString}| ${cells.map((_, i) => {
        const removeLength = head[i].align ? head[i].align === 'center' ? 2 : 1 : 0
        let str = '-'.repeat(Math.max(colLength.get(i)! - removeLength, 2))
        switch (head[i].align) {
          case 'left':
            str = `:${str}`
            break
          case 'center':
            str = `:${str}:`
            break
          case 'right':
            str = `${str}:`
            break
        }
        return str
      }).join(' | ')} |\n`
    }
  }
  return output
}

const parserNode = (node: any, preString = '', parent: any[]) => {
  if (cache.get(node)) return cache.get(node)!
  let str = ''
  const newParent = [...parent, node]
  switch (node.type) {
    case 'paragraph':
      str += preString + toMarkdown(node.children, preString, newParent)
      break
    case 'head':
      str += '#'.repeat(node.level) + ' ' + toMarkdown(node.children, preString, newParent)
      break
    case 'code':
      const code = node.children.map(c => {
        return preString + c.children[0]?.text || ''
      }).join('\n')
      if (node.katex && node.language === 'latex') {
        str += `${preString}$$\n${code}\n${preString}$$`
      } else if (node.language === 'html' && node.render) {
        str += `${preString}\n${code}\n${preString}`
      } else {
        str += `${preString}\`\`\`${node.language || '`'}\n${code}\n${preString}\`\`\`${!node.language ? '`' : ''}`
      }
      break
    case 'blockquote':
      str += toMarkdown(node.children, preString, newParent)
      break
    case 'media':
      str += `![${node.alt}](${encodeURI(node.url)})`
      break
    case 'list':
      str += toMarkdown(node.children, preString, newParent)
      break
    case 'list-item':
      str += toMarkdown(node.children, preString, newParent)
      break
    case 'table':
      str += table(node, preString, newParent)
      break
    case 'hr':
      str += preString + '***'
      break
    default:
      if (node.text) str += composeText(node, parent)
      break
  }
  cache.set(node, str)
  return str
}

export const toMarkdown = (tree: any[], preString = '', parent: any[]) => {
  let str = ''
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    const p = parent[parent.length - 1]
    if (p.type === 'list-item') {
      const list = parent[parent.length - 2]
      let pre = preString + (list.order ? (space + ' ') : space)
      const index = list.children.findIndex(c => c === p)
      if (i === 0) {
        str += preString
        str += list.order ? `${index + 1}. ` : '- '
        if (typeof p.checked === 'boolean') str += `[${p.checked ? 'x' : ' '}] `
        const nodeStr = parserNode(node, '', parent)
        const lines = nodeStr.split('\n')
        // 处理table多行组件问题
        if (lines.length > 1) {
          str += lines.map((l, i) => {
            if (i > 0) {
              l = pre + l
            }
            return l
          }).join('\n')
        } else {
          str += nodeStr
        }
        if (tree.length > 1) {
          str += '\n'
        }
      } else {
        if (node.type !== 'list') {
          str += '\n'
        }
        str += parserNode(node, pre, parent)
        if (node.type !== 'list') {
          str += '\n'
        }
      }
    } else if (p.type === 'blockquote') {
      str += parserNode(node, preString + '> ', parent, )
      if (node.type && i !== tree.length - 1) {
        str += `\n${preString}> `
        if (p.type !== 'list') {
          str += '\n'
        }
      }
    } else {
      str += parserNode(node, preString, parent)
      if (node.type && node.type !== 'media' && i !== tree.length - 1) {
        str += '\n'
        if (p.type !== 'list') {
          str += '\n'
        }
      }
    }
  }
  return str
}
