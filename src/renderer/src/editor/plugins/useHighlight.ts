import { useCallback } from 'react'
import { Editor, Element, Node, NodeEntry, Range, Path } from 'slate'
import { EditorStore } from '../store'
import { EditorUtils } from '../utils/editorUtils'

const htmlReg = /<[a-z]+[\s"'=:;()\w\-\[\]\/.]*\/?>(.*<\/[a-z]+>:?)?/g
const linkReg = /(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/gi

export const cacheTextNode = new WeakMap<object, { path: Path; range: Range[] }>()

export const clearInlineKatex = (editor: Editor) => {
  const inlineMath = Array.from<any>(Editor.nodes(editor, {
    match: n => n.type === 'inline-katex',
    at: []
  }))
  inlineMath.map(c => cacheTextNode.delete(c[0]))
}

const highlightNodes = new Set(['paragraph', 'table-cell', 'code', 'head', 'inline-katex', 'code-line'])

export function useHighlight(store?: EditorStore) {
  return useCallback(([node, path]: NodeEntry):Range[] => {
    if (Element.isElement(node) && highlightNodes.has(node.type)) {
      const ranges = store?.highlightCache.get(node) || []
      const cacheText = cacheTextNode.get(node)
      // footnote
      if (['paragraph', 'table-cell'].includes(node.type)) {
        for (let i = 0; i < node.children.length; i++) {
          const c = node.children[i]
          if (c.text && !EditorUtils.isDirtLeaf(c)) {
            if (cacheText && Path.equals(cacheText.path, path)) {
              ranges.push(...cacheText.range)
            } else {
              let textRanges: any[] = []
              const matchHtml = c.text.matchAll(htmlReg)
              for (let m of matchHtml) {
                textRanges.push({
                  anchor: { path: [...path, i], offset: m.index },
                  focus: { path: [...path, i], offset: m.index + m[0].length },
                  html: true
                })
              }
              const match = c.text.matchAll(/\[\^.+?]:?/g)
              for (let m of match) {
                if (typeof m.index !== 'number') continue
                textRanges.push({
                  anchor: { path: [...path, i], offset: m.index },
                  focus: { path: [...path, i], offset: m.index + m[0].length },
                  fnc: !m[0].endsWith(':'),
                  fnd: m[0].endsWith(':')
                })
              }
              cacheTextNode.set(node, {path, range: textRanges})
              ranges.push(...textRanges)
            }
          }
          if (c.text && !c.url && !c.docId && !c.hash) {
            let textRanges: any[] = []
            const links = (c.text as string).matchAll(linkReg)
            for (let m of links) {
              textRanges.push({
                anchor: { path: [...path, i], offset: m.index },
                focus: {
                  path: [...path, i],
                  offset: m.index! + m[0].length
                },
                link: m[0]
              })
            }
            ranges.push(...textRanges)
          }
        }
      }
      if (node.type === 'paragraph' && node.children.length === 1 && !EditorUtils.isDirtLeaf(node.children[0])) {
        if (cacheText && Path.equals(cacheText.path, path)) {
          ranges.push(...cacheText.range)
        } else {
          const str = Node.string(node)
          if (str.startsWith('```')) {
            ranges.push({
              anchor: {
                path: [...path, 0],
                offset: 0
              },
              focus: {
                path: [...path, 0],
                offset: 3
              },
              color: '#a3a3a3'
            })
            cacheTextNode.set(node, {path, range: ranges})
          } else if (/^\|([^|]+\|)+$/.test(str)) {
            ranges.push({
              anchor: {
                path: [...path, 0],
                offset: 0
              },
              focus: {
                path: [...path, 0],
                offset: str.length
              },
              color: '#a3a3a3'
            })
            cacheTextNode.set(node, {path, range: ranges})
          }
        }
      }
      return ranges
    }
    return []
  }, [store?.refreshHighlight])
}
