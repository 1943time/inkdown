// pre-build to enable parse to run in the worker
import parser from './bundle'
import { Element } from 'slate'
import { Content, Table } from 'mdast'
import { CustomLeaf, Elements, InlineKatexNode, MediaNode, TableNode } from '../../../el'

const findImageElement = (str: string) => {
  try {
    const match = str.match(
      /^\s*<(img|video|iframe)[^>\n]*\/?>(.*<\/(?:img|video|iframe)>:?)?\s*$/
    )
    if (match) {
      const url = match[0].match(/src="([^"\n]+)"/)
      const height = match[0].match(/height="(\d+)"/)
      return { url: url?.[1], height: height ? +height[1] : undefined }
    }
    return null
  } catch (e) {
    return null
  }
}

const findAttachment = (str: string) => {
  try {
    const match = str.match(/^\s*<a[^>\n]*download[^>\n]*\/?>(.*<\/a>:?)?\s*$/)
    if (match) {
      const url = match[0].match(/href="([^"\n]+)"/)
      const size = match[0].match(/data-size="(\d+)"/)
      if (url) {
        return {url: url[1], size: Number(size?.[1] || 0)}
      }
    }
    return null
  } catch (e) {
    return null
  }
}

const parseText = (els: Content[], leaf: CustomLeaf = {}) => {
  let leafs: CustomLeaf[] = []
  for (let n of els) {
    if (n.type === 'strong') leafs = leafs.concat(parseText(n.children, {...leaf, bold: true}))
    if (n.type === 'emphasis') leafs = leafs.concat(parseText(n.children, {...leaf, italic: true}))
    if (n.type === 'delete') leafs = leafs.concat(parseText(n.children, {...leaf, strikethrough: true}))
    if (n.type === 'link') leafs = leafs.concat(parseText(n.children, {...leaf, url: n.url}))
    if (n.type === 'inlineCode') leafs.push({...leaf, text: n.value, code: true})
    // @ts-ignore
    leafs.push({...leaf, text: n.value || ''})
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
            // @ts-ignore
            children: c.children?.length ? parserBlock(c.children, false, c) : [{text: ''}]
          }
        })
      }
    })
  }
  return node
}
const parserBlock = (nodes: Content[], top = false, parent?: Content) => {
  if (!nodes?.length) return [{type: 'paragraph', children: [{text: ''}]}]
  let els:(Elements | Text) [] = []
  let el:Element | null | Element[] = null
  let preNode:null | Content = null
  let htmlTag:{tag: string, color?: string, url?: string}[] = []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    switch (n.type) {
      case 'heading':
        el = {type: 'head', level: n.depth, children: n.children?.length ? parserBlock(n.children, false, n) : [{text: ''}]}
        break
      case 'html':
        if (!parent || ['listItem', 'blockquote'].includes(parent.type)) {
          const img = findImageElement(n.value)
          if (img) {
            el = {type: 'media', height: img?.height, url: decodeURIComponent(img?.url || ''), children: [{text: ''}]}
          } else {
            if (n.value === '<br/>') {
              el = {type: 'paragraph', children: [{text: ''}]}
            } else {
              el = {
                type: 'code', language: 'html', render: true,
                children: n.value.split('\n').map(s => {
                  return {
                    type: 'code-line',
                    children: [{text: s}]
                  }
                })
              }
            }
          }
        } else {
          const breakMatch = n.value.match(/<br\/?>/)
          if (breakMatch) {
            el = {type: 'break', children: [{text: ''}]}
          } else {
            const htmlMatch = n.value.match(/<\/?(b|i|del|code|span|a)[^\n>]*?>/)
            if (htmlMatch) {
              const [str, tag] = htmlMatch
              if (str.startsWith('</') && htmlTag.length && htmlTag[htmlTag.length - 1].tag === tag) {
                htmlTag.pop()
              }
              if (!str.startsWith('</')) {
                if (tag === 'span') {
                  try {
                    const styles = str.match(/style="([^"\n]+)"/)
                    if (styles) {
                      // @ts-ignore
                      const stylesMap = new Map(styles[1].split(';').map(item => item.split(':').map(item => item.trim())))
                      if (stylesMap.get('color')) {
                        htmlTag.push({
                          tag: tag,
                          color: stylesMap.get('color') as string
                        })
                      }
                    }
                  } catch (e) {
                    el = {text: n.value}
                  }
                } else if (tag === 'a') {
                  const url = str.match(/href="([\w:.\/_\-#\\]+)"/)
                  if (url) {
                    htmlTag.push({
                      tag: tag,
                      url: url[1]
                    })
                  }
                } else {
                  htmlTag.push({tag: tag})
                }
              }
            } else {
              const img = findImageElement(n.value)
              if (img) {
                el = {type: 'media', height: img?.height, url: img?.url, children: [{text: ''}]}
              } else {
                el = {text: n.value}
              }
            }
          }
        }
        break
      case 'image':
        el = {type: 'media', children: [{text: ''}], url: decodeURIComponent(n.url), alt: n.alt} as MediaNode
        break
      // @ts-ignore
      case 'inlineMath':
        // @ts-ignore
        el = {type: 'inline-katex', children: [{text: n.value}]} as InlineKatexNode
        break
      case 'list':
        el = {type: 'list', order: n.ordered, start: n.start, children: parserBlock(n.children, false, n)}
        el.task = el.children?.some((s: any) => typeof s.checked === 'boolean')
        break
      case 'footnoteReference':
        el = {text: `[^${n.identifier}]`}
        break
      case 'footnoteDefinition':
        el = {
          type: 'paragraph',
          children: [{text: `[^${n.identifier}]:`}, ...(parserBlock(n.children, false, n)[0] as any)?.children]
        }
        break
      case 'listItem':
        const children = n.children?.length ? parserBlock(n.children, false, n) : [{type: 'paragraph', children: [{text: ''}]}] as any
        if (children[0].type === 'paragraph' && children[0].children[0]?.text) {
          const text = children[0].children[0]?.text
          const m = text.match(/^\[([x\s])]/)
          if (m) {
            el = {type: 'list-item', checked: m ? m[1] === 'x' : undefined, children: children}
            children[0].children[0].text = text.replace(/^\[([x\s])]/, '')
            break
          }
        }
        el = {type: 'list-item', checked: n.checked, children: children}
        break
      case 'paragraph':
        if (n.children?.[0].type === 'html' && n.children[0].value.startsWith('<a')) {
          const text = n.children.map((n) => (n as any).value || '').join('')
          const attach = findAttachment(text)
          if (attach) {
            const name = text.match(/\>(.*)<\/a\>/)
            el = {
              type: 'attach',
              url: decodeURIComponent(attach.url),
              size: attach.size,
              children: [{ text: '' }],
              name: name ? name[1] : attach.url
            }
            break
          }
        }
        el = []
        let textNodes:any[] = []
        for (let c of (n.children || [])) {
          if (c.type === 'image') {
            if (textNodes.length) {
              el.push({
                type: 'paragraph', children: parserBlock(textNodes, false, n)
              })
              textNodes = []
            }
            el.push({
              type: 'media', children: [{text: ''}], url: decodeURIComponent(c.url)
            })
          } else if (c.type === 'html') {
            const img = findImageElement(c.value)
            if (img) {
              el.push({
                type: 'media', children: [{text: ''}], url: decodeURIComponent(img.url || ''), height: img.height
              })
            } else {
              textNodes.push({type: 'html', value: c.value})
            }
          } else {
            textNodes.push(c)
          }
        }
        if (textNodes.length) {
          el.push({
            type: 'paragraph', children: parserBlock(textNodes, false, n)
          })
        }
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
      case 'yaml':
        el = {
          type: 'code', language: 'yaml', frontmatter: true,
          children: n.value.split('\n').map(s => {
            return {
              type: 'code-line',
              children: [{text: s}]
            }
          })
        }
        break
      // @ts-ignore
      case 'math':
        el = {
          type: 'code', language: 'latex', katex: true,
          // @ts-ignore
          children: n.value.split('\n').map(s => {
            return {
              type: 'code-line',
              children: [{text: s}]
            }
          })
        }
        break
      case 'blockquote':
        el = {type: 'blockquote', children: n.children?.length ? parserBlock(n.children, false, n) : [{type: 'paragraph', children: [{text: ''}]}]}
        break
      case 'table':
        el = parseTable(n)
        break
      default:
        if (n.type === 'text' && htmlTag.length) {
          el = {text: n.value}
          if (n.value) {
            for (let t of htmlTag) {
              if (t.tag === 'code')  el.code = true
              if (t.tag === 'i') el.italic = true
              if (t.tag === 'b' || t.tag === 'strong') el.bold = true
              if (t.tag === 'del') el.strikethrough = true
              if (t.tag === 'span' && t.color) el.highColor = t.color
              if (t.tag === 'a' && t.url) {
                el.url = t.url
              }
            }
          }
          break
        } else if (['strong', 'link', 'text', 'emphasis', 'delete', 'inlineCode'].includes(n.type)) {
          if (n.type === 'text') {
            el = {text: n.value}
          } else {
            const leaf:CustomLeaf = {}
            if (n.type === 'strong') leaf.bold = true
            if (n.type === 'emphasis') leaf.italic = true
            if (n.type === 'delete') leaf.strikethrough = true
            if (n.type === 'link') {
              leaf.url = decodeURIComponent(n.url)
            }
            // @ts-ignore
            el = parseText(n.children?.length ? n.children : [{value: leaf.url || ''}], leaf)
          }
        } else if (n.type === 'break') {
          el = {text: '\n'}
        } else {
          el = {text: ''}
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

const findLinks = (schema: any[], prePath: number[] = [], links: {path: number[], target: string}[] = []) => {
  for (let i = 0; i < schema.length; i++) {
    const n = schema[i]
    const curPath = [...prePath, i]
    if (n.url) {
      links.push({path: curPath, target: n.url})
    }
    if (n.children) {
      findLinks(n.children, curPath, links)
    }
  }
  return links
}

// export const parseMarkdown = (files: string[]) => {
//   const root = parser.parse(files[0] || '')
//   const schema = parserBlock(root.children as any[], true)
//   const links = findLinks(schema)
//   return {schema, links}
// }

onmessage = e => {
  const files:string[] = e.data.files
  postMessage({
    results: files.map(str => {
      try {
        const root = parser.parse(str || '')
        const schema= parserBlock(root.children as any[], true)
        const links = findLinks(schema)
        return {schema, links}
      } catch (e) {
        console.error('parser error', e)
        return {schema: [{type: 'paragraph', children: [{text: str}]}], links: []}
      }
    }),
    id: e.data.id
  })
}
