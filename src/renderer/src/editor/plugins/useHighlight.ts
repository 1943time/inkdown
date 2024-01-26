import {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editor, Element, Node, NodeEntry, Range} from 'slate'
import {useSlate} from 'slate-react'
import {CodeNode} from '../../el'
import {observer} from 'mobx-react-lite'
import {EditorStore, useEditorStore} from '../store'
import {EditorUtils} from '../utils/editorUtils'
import {runInAction} from 'mobx'
import {treeStore} from '../../store/tree'
import {codeLangMap} from '../output/html/transform'
import {configStore} from '../../store/config'

const htmlReg = /<[a-z]+[\s"'=:;()\w\-\[\]\/.]*\/?>(.*<\/[a-z]+>:?)?/g
export const codeCache = new WeakMap<object, Range[]>()
export const cacheTextNode = new WeakMap<object, Range[]>
export const clearAllCodeCache = (editor: Editor) => {
  const codes = Array.from<any>(Editor.nodes(editor, {
    match: n => Element.isElement(n) && n.type === 'code',
    at: []
  }))
  codes.map(c => codeCache.delete(c[0]))
}

const highlightNodes = new Set(['paragraph', 'table-cell', 'code', 'head', 'inline-katex', 'code-line'])
let clearTimer = 0

export const clearCodeCache = (node: any) => {
  codeCache.delete(node)
  clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    runInAction(() => {
      treeStore.currentTab!.store!.refreshHighlight = !treeStore.currentTab!.store!.refreshHighlight
    })
  }, 60)
}
export function useHighlight(store?: EditorStore) {
  return useCallback(([node, path]: NodeEntry):Range[] => {
    if (Element.isElement(node) && highlightNodes.has(node.type)) {
      const ranges = store?.highlightCache.get(node) || []
      if (node.type === 'code') {
        ranges.push(...codeCache.get(node) || [])
      }
      if (node.type === 'inline-katex') {
        if (cacheTextNode.get(node)) {
          ranges.push(...cacheTextNode.get(node)!)
        } else {
          const code = Node.string(node)
          if (code) {
            let textRanges: any[] = []
            const tokens = configStore.config.dark ? window.api.highlightCode(code, 'tex') : window.api.highlightInlineFormula(code)
            let start = 0
            const lineToken = tokens[0]
            for (let t of lineToken) {
              const length = t.content.length
              if (!length) {
                continue
              }
              const end = start + length
              textRanges.push({
                anchor: { path, offset: start },
                focus: { path, offset: end },
                color: t.color
              })
              start = end
            }
            cacheTextNode.set(node, textRanges)
            ranges.push(...textRanges)
          }
        }
      }
      // footnote
      if (['paragraph', 'table-cell'].includes(node.type)) {
        for (let i = 0; i < node.children.length; i++) {
          const c = node.children[i]
          if (c.text && !EditorUtils.isDirtLeaf(c)) {
            const cache = cacheTextNode.get(c)
            if (cache) {
              ranges.push(...cache)
            } else {
              let textRanges: any[] = []
              const matchHtml = c.text.matchAll(htmlReg)
              for (let m of matchHtml) {
                textRanges.push({
                  anchor: {path: [...path, i], offset: m.index},
                  focus: {path: [...path, i], offset: m.index + m[0].length},
                  html: true
                })
              }
              const match = c.text.matchAll(/\[\^.+?]:?/g)
              for (let m of match) {
                if (typeof m.index !== 'number') continue
                textRanges.push({
                  anchor: {path: [...path, i], offset: m.index},
                  focus: {path: [...path, i], offset: m.index + m[0].length},
                  fnc: !m[0].endsWith(':'),
                  fnd: m[0].endsWith(':'),
                })
              }
              cacheTextNode.set(c, textRanges)
              ranges.push(...textRanges)
            }
          }
        }
      }
      if (node.type === 'paragraph' && node.children.length === 1 && !EditorUtils.isDirtLeaf(node.children[0])) {
        if (cacheTextNode.get(node)) {
          ranges.push(...cacheTextNode.get(node)!)
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
            cacheTextNode.set(node, ranges)
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
            cacheTextNode.set(node, ranges)
          }
        }
      }
      return ranges
    }
    return []
  }, [store?.refreshHighlight])
}

export const SetNodeToDecorations = observer(() => {
  const editor = useSlate()
  const store = useEditorStore()
  const parser = useCallback(() => {
    const codes = Array.from(
      Editor.nodes<CodeNode>(editor, {
        at: [],
        match: n => Element.isElement(n) && n.type === 'code' && !codeCache.get(n)
      })
    ).map(node => {
      return {
        node,
        code: node[0].children.map(n => Node.string(n)).join('\n')
      }
    })
    for (let c of codes) {
      if (c.code.length > 20000) continue
      const lang = codeLangMap(c.node[0].language?.toLowerCase() || '')
      if (!window.api.langSet.has(lang)) continue
      const el = c.node[0]
      let handle = codeCache.get(el)
      if (!handle) {
        const ranges: Range[] = []
        const tokens = window.api.highlightCode(c.code, lang)
        for (let i = 0; i < tokens.length; i++) {
          const lineToken = tokens[i]
          let start = 0
          for (let t of lineToken) {
            const length = t.content.length
            if (!length) {
              continue
            }
            const end = start + length
            const path = [...c.node[1], i, 0]
            ranges.push({
              anchor: { path, offset: start },
              focus: { path, offset: end },
              color: t.color
            })
            start = end
          }
        }
        codeCache.set(el, ranges)
      }
    }
  }, [])
  useMemo(() => {
    if (store?.pauseCodeHighlight) return
    parser()
  }, [editor.children, store?.pauseCodeHighlight])
  return null
})
