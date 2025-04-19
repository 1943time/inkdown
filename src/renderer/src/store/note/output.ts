import { Node } from 'slate'
import stringWidth from 'string-width'
import { Store } from '../store'
import { CustomLeaf, TableNode } from '@/editor'
import { IDoc } from 'types/model'
import { mediaType } from '@/editor/utils/dom'
export class MarkdownOutput {
  constructor(private readonly store: Store) {}
  private readonly space = '  '
  private filePath = ''
  private exportRootPath: undefined | string = undefined
  // 仅收集小于5mb图片
  private depMedias = new Map<string, string>()
  private readonly inlineNode = new Set(['inline-katex', 'break'])
  private isMix(t: CustomLeaf) {
    return (
      Object.keys(t).filter((key) => ['bold', 'code', 'italic', 'strikethrough'].includes(key))
        .length > 1
    )
  }
  get nodes() {
    return this.store.note.state.nodes
  }
  getAttachmentPath(name: string) {
    return window.api.path.join(this.exportRootPath!, `.files/${name}`)
  }
  getNodeSpacePath(node: IDoc) {
    const path = [node.name + (node.folder ? '' : '.md')]
    while (node.parentId && node.parentId !== 'root') {
      const parent = this.nodes[node.parentId]
      if (parent) {
        path.unshift(parent.name)
        node = parent
      }
    }
    return window.api.path.join(this.exportRootPath!, path.join('/'))
  }

  private docIdToRelateivePath(id: string) {
    const node = this.nodes[id]
    if (node) {
      const path = this.getNodeSpacePath(node)
      return window.api.path.relative(window.api.path.join(this.filePath, '..'), path)
    }
    return null
  }

  private getFileRelativePath(name: string) {
    return window.api.path.relative(
      window.api.path.join(this.filePath, '..'),
      this.getAttachmentPath(name)
    )
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

  private async table(el: TableNode, preString = '', parent: any[]) {
    const children = el.children
    const head = children[0]?.children
    if (!children.length || !head.length) return ''
    let data: string[][] = []
    for (let c of children) {
      const row: string[] = []
      if (c.type === 'table-row') {
        for (let n of c.children) {
          if (n.type === 'table-cell') {
            row.push(await this.parse(n.children, '', [...parent, n]))
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

  private async parserNode(node: any, preString = '', parent: any[]) {
    let str = ''
    const newParent = [...parent, node]
    switch (node.type) {
      case 'paragraph':
        str += preString + (await this.parse(node.children, preString, newParent))
        break
      case 'head':
        str +=
          '#'.repeat(node.level) + ' ' + (await this.parse(node.children, preString, newParent))
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
        str += await this.parse(node.children, preString, newParent)
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
        str += await this.parse(node.children, preString, newParent)
        break
      case 'list-item':
        str += await this.parse(node.children, preString, newParent)
        break
      case 'table':
        str += await this.table(node, preString, newParent)
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

  async toMarkdown(data: { node: IDoc; exportRootPath?: string }) {
    this.depMedias.clear()
    this.exportRootPath = data.exportRootPath
    this.filePath = this.getNodeSpacePath(data.node)
    const md = await this.parse(data.node.schema || [])
    return { md, medias: this.depMedias }
  }

  private async parse(tree: any[], preString = '', parent: any[] = [{ root: true }]) {
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
          const nodeStr = await this.parserNode(node, '', parent)
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
                (await this.parserNode(node, preString, parent))?.replace(/^[\s\t]+/g, '') +
                '\n\n'
            }
          } else {
            str += (await this.parserNode(node, pre, parent)) + '\n'
            if (tree.length - 1 !== i) {
              str += '\n'
            }
          }
        }
      } else if (p.type === 'blockquote') {
        str += await this.parserNode(node, preString + '> ', parent)
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
            preString +
            (await this.parserNode(node, preString, parent))?.replace(/^[\s\t]+/g, '') +
            '\n\n'
        }
      } else {
        str += await this.parserNode(node, preString, parent)
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
}
