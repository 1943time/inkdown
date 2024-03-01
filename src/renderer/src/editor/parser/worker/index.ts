// pre-build to enable parse to run in the worker
import parser from './bundle'
import {Element, Node} from 'slate'
import {Content, Table} from 'mdast'
import {CustomLeaf, Elements, InlineKatexNode, MediaNode, TableNode} from '../../../el'

let share = false
const findImageElement = (str: string) => {
  try {
    const match = str.match(/^<img+[\s"'=:;()\w\-\[\]\/.]*\/?>(.*<\/img>:?)?$/)
    if (match) {
      const url = match[0].match(/src="([^"\n]+)"/)
      const width = match[0].match(/width="(\d+)"/)
      return {url: url?.[1], width: width?.[1]}
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
  for (let n of nodes) {
    switch (n.type) {
      case 'heading':
        el = {type: 'head', level: n.depth, children: n.children?.length ? parserBlock(n.children, false, n) : [{text: ''}]}
        break
      case 'html':
        if (!parent || ['listItem', 'blockquote'].includes(parent.type)) {
          const img = findImageElement(n.value)
          if (img) {
            el = {type: 'paragraph', children: [{type: 'media',width: img?.width, url: img?.url, children: [{text: ''}]}]}
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
            const htmlMatch = n.value.match(/<\/?(b|i|del|code|span|a)[^\n\/]*?>/)
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
                el = {type: 'media', width: img?.width, url: img?.url, children: [{text: ''}]}
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
        if (share) {
          el = {type: 'footnoteReference', identifier: n.identifier, children: [{text: n.identifier}]}
        } else {
          el = {text: `[^${n.identifier}]`}
        }
        break
      case 'footnoteDefinition':
        if (share) {
          el = {
            type: 'footnoteDefinition', identifier: n.identifier,
            children: parserBlock(n.children, false, n)
          }
        } else {
          el = {
            type: 'paragraph',
            children: [{text: `[^${n.identifier}]:`}, ...(parserBlock(n.children, false, n)[0] as any)?.children]
          }
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
        el = {type: 'paragraph', children: parserBlock(n.children?.length ? n.children : [{value: '', type: 'text'}], false, n)}
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
              if (t.tag === 'a' && t.url) el.url = t.url
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
            if (n.type === 'link') leaf.url = decodeURIComponent(n.url)
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

// export const parse = (files: string[]) => {
//   const root = parser.parse(files[0] || '')
//   return parserBlock(root.children as any[], true)
// }

onmessage = e => {
  const files:string[] = e.data.files
  share = e.data.share
  postMessage(files.map(str => {
    try {
      const root = parser.parse(str || '')
      return parserBlock(root.children as any[], true)
    } catch (e) {
      return [{type: 'paragraph', children: [{text: ''}]}]
    }
  }))
}
