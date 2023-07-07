import {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editor, Element, Node, NodeEntry, Range} from 'slate'
import {useSlate} from 'slate-react'
import {CodeNode} from '../../el'
import {observer} from 'mobx-react-lite'
import {EditorStore, useEditorStore} from '../store'
import {EditorUtils} from '../utils/editorUtils'

export const codeCache = new WeakMap<object, {
  code: string,
  language?: string
}>()

export const cacheFootNote = new WeakMap<object, Range[]>

export const cacheLine = new WeakMap<object, Range[]>()
export function useHighlight(store?: EditorStore) {
  return useCallback(([node, path]: NodeEntry):Range[] => {
    if (Element.isElement(node) && ['paragraph', 'table-cell', 'code-line', 'head'].includes(node.type)) {
      const ranges = store?.highlightCache.get(node) || []
      if (node.type === 'code-line') {
        ranges.push(...cacheLine.get(node) || [])
      }
      // footnote
      if (['paragraph', 'table-cell'].includes(node.type)) {
        for (let i = 0; i < node.children.length; i++) {
          const c = node.children[i]
          if (c.text && !EditorUtils.isDirtLeaf(node)) {
            const cache = cacheFootNote.get(c)
            if (cache) {
              ranges.push(...cache)
            } else {
              const match = c.text.matchAll(/\[\^.+?]:?/g)
              let fNRanges: any[] = []
              for (let m of match) {
                if (typeof m.index !== 'number') continue
                fNRanges.push({
                  anchor: {path: [...path, i], offset: m.index},
                  focus: {path: [...path, i], offset: m.index + m[0].length},
                  fnc: !m[0].endsWith(':'),
                  fnd: m[0].endsWith(':'),
                })
              }
              cacheFootNote.set(c, fNRanges)
              ranges.push(...fNRanges)
            }
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
        mode: 'highest',
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
      const lang = c.node[0].language || ''
      if (!window.api.langSet.has(lang)) continue
      const el = c.node[0]
      let handle = codeCache.get(el)
      if (!handle) {
        handle = {
          code: c.code,
          language: c.node[0].language
        }
        codeCache.set(el, handle)
        const tokens = window.api.highlightCode(c.code, lang)
        for (let i = 0; i < tokens.length; i++) {
          const element = c.node[0]
          const line = element.children[i]
          if (cacheLine.get(line)) continue
          const ranges: Range[] = []
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
          cacheLine.set(line, ranges)
        }
      }
    }
  }, [])
  useMemo(() => {
    if (store?.pauseCodeHighlight) return
    parser()
  }, [editor.children, store?.pauseCodeHighlight])
  return null
})
