import { parse } from '@/editor/parser/worker'
import { Node } from 'slate'
import stringWidth from 'string-width'
import { CustomLeaf, TableNode } from '@/editor'
import { mediaType } from '@/editor/utils/dom'
import { getTokens } from '@/utils/ai'
import dayjs from 'dayjs'
import { join } from 'path-browserify'
import { decode, encode } from '@msgpack/msgpack'
export type INode = { id: string; name: string; folder: boolean; parentId: string; updated: number }

function relative(from: string, to: string): string {
  const normalizePathParts = (p: string): string[] => {
    const parts = p.split(/[/\\]/).filter(Boolean)
    const result: string[] = []

    for (const part of parts) {
      if (part === '.') continue
      if (part === '..') {
        if (result.length > 0) result.pop()
        continue
      }
      result.push(part)
    }

    return result
  }

  const fromParts = normalizePathParts(from)
  const toParts = normalizePathParts(to)

  let commonLength = 0
  const minLength = Math.min(fromParts.length, toParts.length)

  while (commonLength < minLength && fromParts[commonLength] === toParts[commonLength]) {
    commonLength++
  }

  const upCount = fromParts.length - commonLength
  const relativeParts: string[] = []

  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..')
  }

  relativeParts.push(...toParts.slice(commonLength))
  if (relativeParts.length === 0) return '.'

  return relativeParts.join('/')
}

class Output {
  public nodes: Record<string, INode> = {}
  private readonly space = '  '
  private filePath = ''
  private exportRootPath: undefined | string = undefined
  private depMedias = new Map<string, string>()
  private maxChunkSize = 600
  private lastMinChunkSize = 300
  private readonly inlineNode = new Set(['inline-katex', 'break'])
  private isMix(t: CustomLeaf) {
    return (
      Object.keys(t).filter((key) => ['bold', 'code', 'italic', 'strikethrough'].includes(key))
        .length > 1
    )
  }
  getAttachmentPath(name: string) {
    return join(this.exportRootPath!, `.files/${name}`)
  }
  getNodeSpacePath(node: INode) {
    const path = [node.name + (node.folder ? '' : '.md')]
    while (node.parentId && node.parentId !== 'root') {
      const parent = this.nodes[node.parentId]
      if (parent) {
        path.unshift(parent.name)
        node = parent
      }
    }
    return join(this.exportRootPath || '', path.join('/'))
  }

  private docIdToRelateivePath(id: string) {
    const node = this.nodes[id]
    if (node) {
      const path = this.getNodeSpacePath(node)
      return relative(join(this.filePath, '..'), path)
    }
    return null
  }

  private getFileRelativePath(name: string) {
    return relative(join(this.filePath, '..'), this.getAttachmentPath(name))
  }

  private textHtml(t: CustomLeaf) {
    let str = t.text || ''
    if (t.highColor) str = `<span style="color:${t.highColor}">${str}</span>`
    if (t.code) str = `<code>${str}</code>`
    if (t.italic) str = `<i>${str}</i>`
    if (t.bold) str = `<b>${str}</b>`
    if (t.strikethrough) str = `<del>${str}</del>`
    if (t.docId) {
      const url = encodeURIComponent(this.docIdToRelateivePath(t.docId) || '')
      if (url) {
        str = `<a href="${url}">${str}</a>`
      }
    } else if (t.url) {
      str = `<a href="${t.url}">${str}</a>`
    }
    return str
  }

  private textStyle(t: CustomLeaf) {
    if (!t.text) return ''
    let str = t.text.replace(/(?<!\\)\\/g, '\\').replace(/\n/g, '  \n')
    let preStr = '',
      afterStr = ''
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

  private composeText(t: CustomLeaf, parent: any[]) {
    if (!t.text) return ''
    if (t.highColor || (t.strikethrough && (t.bold || t.italic || t.code))) return this.textHtml(t)
    const siblings = parent[parent.length - 1]?.children
    const index = siblings?.findIndex((n: any) => n === t)
    let str = this.textStyle(t)!
    if (t.docId) {
      const url = encodeURIComponent(this.docIdToRelateivePath(t.docId) || '')
      if (url) {
        str = `[${t.text}](${url})`
      }
    } else if (t.url) {
      str = `[${t.text}](${t.url})`
    } else if (this.isMix(t) && index !== -1) {
      const next = siblings[index + 1]
      if (!str.endsWith(' ') && next && !Node.string(next).startsWith(' ')) {
        str += ' '
      }
    }
    return str
  }

  private table(el: TableNode, preString = '', parent: any[]) {
    const children = el.children
    const head = children[0]?.children
    if (!children.length || !head.length) return ''
    let data: string[][] = []
    for (let c of children) {
      const row: string[] = []
      if (c.type === 'table-row') {
        for (let n of c.children) {
          if (n.type === 'table-cell') {
            row.push(this.parse(n.children, '', [...parent, n]))
          }
        }
      }
      data.push(row)
    }
    let output = '',
      colLength = new Map<number, number>()
    for (let i = 0; i < data[0].length; i++) {
      colLength.set(i, data.map((d) => stringWidth(d[i])).sort((a, b) => b - a)[0])
    }
    for (let i = 0; i < data.length; i++) {
      let cells: string[] = []
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
        output += `${preString}| ${cells
          .map((_, i) => {
            const removeLength = head[i].align ? (head[i].align === 'center' ? 2 : 1) : 0
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
          })
          .join(' | ')} |\n`
      }
    }
    return output
  }

  private parserNode(node: any, preString = '', parent: any[]) {
    let str = ''
    const newParent = [...parent, node]
    switch (node.type) {
      case 'paragraph':
        str += preString + this.parse(node.children, preString, newParent)
        break
      case 'head':
        str += '#'.repeat(node.level) + ' ' + this.parse(node.children, preString, newParent)
        break
      case 'code':
        const code = (node.code || '')
          .split('\n')
          .map((c: any) => {
            return preString + c
          })
          .join('\n')
        if (node.katex && (node.language === 'latex' || node.language === 'tex')) {
          str += `${preString}$$\n${code}\n${preString}$$`
        } else if (node.language === 'html' && node.render) {
          str += `${preString}\n${code}\n${preString}`
        } else if (node.frontmatter) {
          str += `${preString}---\n${code}\n${preString}---`
        } else {
          str += `${preString}\`\`\`${node.language || '`'}\n${code}\n${preString}\`\`\`${!node.language ? '`' : ''}`
        }
        break
      case 'blockquote':
        str += this.parse(node.children, preString, newParent)
        break
      case 'media':
        let url = node.url
        const type = mediaType(node.id || node.url)
        if (node.id) {
          if (this.exportRootPath) {
            url = this.getFileRelativePath(node.id)
            this.depMedias.set(node.id, node.id)
          } else {
            url = node.name
          }
        }
        if (node.height) {
          if (type === 'video') {
            str += `<video src="${encodeURI(url)}" alt="" height="${node.height || ''}"/>`
          } else if (type === 'image') {
            str += `<img src="${encodeURI(url)}" alt="" height="${node.height || ''}" ${node.align ? `data-align="${node.align}"` : ''}/>`
          } else {
            str += `<iframe src="${encodeURI(url)}" alt="" height="${node.height || ''}"/>`
          }
        } else {
          if (type === 'video') {
            str += `<video src="${encodeURI(url)}"/>`
          } else if (type === 'image') {
            if (node.align) {
              str += `<img src="${encodeURI(url)}" alt="" ${node.align ? `data-align="${node.align}"` : ''}/>`
            } else {
              str += `![${node.alt || ''}](${encodeURI(url)})`
            }
          } else {
            str += `<iframe src="${encodeURI(url)}"/>`
          }
        }
        break
      case 'inline-katex':
        const inlineCode = Node.string(node)
        if (inlineCode) str += `$${inlineCode}$`
        break
      case 'list':
        str += this.parse(node.children, preString, newParent)
        break
      case 'list-item':
        str += this.parse(node.children, preString, newParent)
        break
      case 'table':
        str += this.table(node, preString, newParent)
        break
      case 'hr':
        str += preString + '***'
        break
      case 'break':
        str += preString + '<br/>'
        break
      default:
        if (node.text) str += this.composeText(node, parent)
        break
    }
    return str
  }

  toMarkdown(data: { schema: any[]; node: INode; exportRootPath?: string }) {
    this.depMedias.clear()
    this.exportRootPath = data.exportRootPath || ''
    this.filePath = this.getNodeSpacePath(data.node)
    const md = this.parse(data.schema || [])
    return { md, medias: this.depMedias }
  }

  getChunks(schema: any[], doc: INode) {
    this.depMedias.clear()
    this.exportRootPath = undefined
    this.filePath = ''
    const chunks: {
      text: string
      path: number
      type: string
    }[] = []
    const meta = `# Doc: ${doc.name}, Updated time ${dayjs(doc.updated!).format('YYYY MM DD HH mm')}`
    let currentChunk = {
      text: meta,
      path: 0,
      type: 'meta',
      size: getTokens(meta)
    }
    for (let i = 0; i < schema.length; i++) {
      try {
        const node = schema[i]
        if (node.type === 'media' || node.type === 'hr') continue
        const text = this.parse([node]).trim()
        if (!text) continue
        const tokens = getTokens(text)
        if (currentChunk.size + tokens > this.maxChunkSize) {
          if (currentChunk.size < this.lastMinChunkSize) {
            currentChunk.text += '\n\n' + text
            currentChunk.size += tokens
          } else {
            chunks.push(currentChunk)
            currentChunk = {
              text,
              path: i,
              type: node.type,
              size: tokens
            }
          }
        } else {
          currentChunk.text += '\n\n' + text
          currentChunk.size += tokens
        }
      } catch (e) {
        console.error(e)
      }
    }
    if (currentChunk.text) {
      chunks.push(currentChunk)
    }
    if (chunks.length > 1 && currentChunk.size < this.lastMinChunkSize) {
      const last = chunks.pop()!
      chunks[chunks.length - 1].text += last.text
    }
    return chunks
  }

  private parse(tree: any[], preString = '', parent: any[] = [{ root: true }]) {
    let str = ''
    for (let i = 0; i < tree.length; i++) {
      const node = tree[i]
      const p = parent[parent.length - 1]
      if (p.type === 'list-item') {
        const list = parent[parent.length - 2]
        let pre = preString + (list.order ? this.space + ' ' : this.space)
        let index = list.children.findIndex((c: any) => c === p)
        if (list.start) index += list.start - 1
        if (i === 0) {
          str += preString
          str += list.order ? `${index + 1}. ` : '- '
          if (typeof p.checked === 'boolean') str += `[${p.checked ? 'x' : ' '}] `
          const nodeStr = this.parserNode(node, '', parent)
          const lines = nodeStr.split(/\r?\n/)
          // 处理table多行组件问题
          if (lines.length > 1) {
            str += lines
              .map((l, i) => {
                if (i > 0) {
                  l = pre + l
                }
                return l
              })
              .join('\n')
          } else {
            str += nodeStr
          }
          if (tree.length > 1) {
            str += '\n\n'
          }
        } else {
          if (
            node.type === 'paragraph' &&
            tree[i - 1]?.type === 'list' &&
            tree[i + 1]?.type === 'list'
          ) {
            if (!Node.string(node)?.replace(/\s|\t/g, '')) {
              str += `\n\n${pre}<br/>\n\n`
            } else {
              str +=
                '\n\n' +
                pre +
                this.parserNode(node, preString, parent)?.replace(/^[\s\t]+/g, '') +
                '\n\n'
            }
          } else {
            str += this.parserNode(node, pre, parent) + '\n'
            if (tree.length - 1 !== i) {
              str += '\n'
            }
          }
        }
      } else if (p.type === 'blockquote') {
        str += this.parserNode(node, preString + '> ', parent)
        if (node.type && i !== tree.length - 1) {
          str += `\n${preString}> `
          if (p.type !== 'list') {
            str += '\n'
          }
        }
      } else if (
        node.type === 'paragraph' &&
        tree[i - 1]?.type === 'list' &&
        tree[i + 1]?.type === 'list'
      ) {
        if (!Node.string(node)?.replace(/\s|\t/g, '')) {
          str += '<br/>\n\n'
        } else {
          str +=
            preString + this.parserNode(node, preString, parent)?.replace(/^[\s\t]+/g, '') + '\n\n'
        }
      } else if (node.type === 'wiki-link') {
        str += `[[${Node.string(node)}]]`
      } else {
        str += this.parserNode(node, preString, parent)
        if (node.type && !this.inlineNode.has(node.type) && i !== tree.length - 1) {
          str += '\n'
          if (p.type !== 'list') {
            str += '\n'
          }
        }
      }
    }
    return str
  }
  getSchemaText(schema: any[]) {
    let text = ''
    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.text) {
          text += node.text
        } else if (node.type) {
          if (['paragraph', 'heading', 'block-quote', 'table', 'table-row'].includes(node.type)) {
            text += '\n'
          }
          if (node.type === 'code' && node.code) {
            text += '\n' + node.code + '\n'
          }
          if (node.type === 'table-cell') {
            text += ' '
          }
          if (node.children) {
            traverse(node.children)
          }
        }
      }
    }
    traverse(schema)
    return text.trim()
  }
}
const output = new Output()

onmessage = async (e) => {
  const data = decode(e.data) as any
  if (data.type === 'getSchemaText') {
    let text = ''
    try {
      text = output.getSchemaText(data.schema)
    } catch (e) {
      console.error('getSchemaText error', e)
    }
    const binary = encode({
      data: text,
      id: data.id
    })
    // @ts-ignore
    postMessage(binary, [binary.buffer])
  }
  if (data.type === 'parseMarkdown') {
    try {
      const binary = encode({
        data: parse(data.md),
        id: data.id
      })
      postMessage(binary, '*', [binary.buffer])
    } catch (error) {
      const binary = encode({
        data: [{ type: 'paragraph', children: [{ text: '' }] }],
        id: data.id
      })
      // @ts-ignore
      postMessage(binary, [binary.buffer])
      console.error('parseMarkdown error', error)
    }
  }
  if (data.type === 'getChunks') {
    try {
      output.nodes = data.nodes
      const chunks = output.getChunks(data.schema, data.doc)
      const binary = encode({
        data: chunks,
        id: data.id
      })
      // @ts-ignore
      postMessage(binary, [binary.buffer])
    } catch (e) {
      console.error('getChunks error', e)
    }
  }
  if (e.data.type === 'toMarkdown') {
    try {
      output.nodes = e.data.nodes
      const { md, medias } = output.toMarkdown({
        schema: e.data.schema,
        node: e.data.doc,
        exportRootPath: e.data.exportRootPath
      })
      const binary = encode({
        data: {
          md,
          medias: Array.from(medias.values())
        },
        id: e.data.id
      })
      // @ts-ignore
      postMessage(binary, [binary.buffer])
    } catch (e) {
      console.error('toMarkdown error', e)
    }
  }
}
