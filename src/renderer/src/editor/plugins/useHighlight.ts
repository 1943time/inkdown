import {useCallback, useMemo} from 'react'
import {Editor, Element, Node, NodeEntry, Range, Path} from 'slate'
import {useSlate} from 'slate-react'
import {CodeNode} from '../../types/el'
import {observer} from 'mobx-react-lite'
import {EditorStore, useEditorStore} from '../store'
import {EditorUtils} from '../utils/editorUtils'
import {runInAction} from 'mobx'
import {highlighter, langSet, loadedLanguage} from '../utils/highlight'
import { useCoreContext } from '../../store/core'

const htmlReg = /<[a-z]+[\s"'=:;()\w\-\[\]\/.]*\/?>(.*<\/[a-z]+>:?)?/g
const linkReg = /(https?|ftp):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/gi

export const codeCache = new WeakMap<object, {path: Path, range: Range[]}>()
export const cacheTextNode = new WeakMap<object, { path: Path; range: Range[] }>()
export const clearAllCodeCache = (editor: Editor) => {
  const codes = Array.from<any>(Editor.nodes(editor, {
    match: n => Element.isElement(n) && (n.type === 'code'),
    at: []
  }))
  codes.map(c => codeCache.delete(c[0]))
}

export const clearInlineKatex = (editor: Editor) => {
  const inlineMath = Array.from<any>(Editor.nodes(editor, {
    match: n => n.type === 'inline-katex',
    at: []
  }))
  inlineMath.map(c => cacheTextNode.delete(c[0]))
}

const highlightNodes = new Set(['paragraph', 'table-cell', 'code', 'head', 'inline-katex', 'code-line'])
let clearTimer = 0


const run = (node: NodeEntry, code: string, lang: any, theme: any) => {
  try {
    const el = node[0]
    const ranges: Range[] = []
    const tokens = highlighter.codeToTokensBase(code, {
      lang: lang,
      // theme: configStore.curCodeTheme as any,
      theme,
      includeExplanation: false,
      tokenizeMaxLineLength: 5000
    })
    for (let i = 0; i < tokens.length; i++) {
      const lineToken = tokens[i]
      let start = 0
      for (let t of lineToken) {
        const length = t.content.length
        if (!length) {
          continue
        }
        const end = start + length
        const path = [...node[1], i, 0]
        ranges.push({
          anchor: {path, offset: start},
          focus: {path, offset: end},
          color: t.color
        })
        start = end
      }
    }
    codeCache.set(el, {path: node[1], range: ranges})
  } catch (e) {
  }
}
let stack: { run: Function, lang: string }[] = []

export function useHighlight(store?: EditorStore) {
  const core = useCoreContext()
  return useCallback(([node, path]: NodeEntry):Range[] => {
    if (Element.isElement(node) && highlightNodes.has(node.type)) {
      const ranges = store?.highlightCache.get(node) || []
      if (node.type === 'code') {
        ranges.push(...codeCache.get(node)?.range || [])
      }
      const cacheText = cacheTextNode.get(node)
      if (node.type === 'inline-katex') {
        if (cacheText && Path.equals(cacheText.path, path)) {
          ranges.push(...cacheText.range)
        } else {
          const code = Node.string(node)
          if (code) {
            let textRanges: any[] = []
            const tokens = highlighter.codeToTokensBase(code, {
              lang: 'tex',
              theme: core.config.curCodeTheme as any,
              includeExplanation: false,
              tokenizeMaxLineLength: 5000
            })
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
            cacheTextNode.set(node, {path, range: textRanges})
            ranges.push(...textRanges)
          }
        }
      }
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

export const SetNodeToDecorations = observer(() => {
  const core = useCoreContext()
  const editor = useSlate()
  const store = useEditorStore()
  const parser = useCallback(() => {
    const codes = Array.from(
      Editor.nodes<CodeNode>(editor, {
        at: [],
        match: (n, path) => {
          if (Element.isElement(n) && n.type === 'code') {
            const cache = codeCache.get(n)
            if (!cache) return true
            if (!Path.equals(cache.path, path)) {
              codeCache.set(n, {
                path,
                range: cache.range.map((r) => {
                  return {
                    ...r,
                    anchor: {
                      path: [...path, ...r.anchor.path.slice(-2)],
                      offset: r.anchor.offset
                    },
                    focus: {
                      path: [...path, ...r.focus.path.slice(-2)],
                      offset: r.focus.offset
                    }
                  }
                })
              })
              return true
            }
          }
          return false
        }
      })
    ).map((node) => {
      return {
        node,
        code: node[0].children.map((n) => Node.string(n)).join('\n')
      }
    })
    for (let c of codes) {
      if (c.code.length > 10000) continue
      const lang = c.node[0].language?.toLowerCase() || ''
      if (!langSet.has(lang)) continue
      const el = c.node[0]
      let handle = codeCache.get(el)
      if (!handle) {
        if (!loadedLanguage.has(lang)) {
          stack.push({
            run: () => run(c.node, c.code, lang, core.config.curCodeTheme),
            lang: lang
          })
        } else {
          run(c.node, c.code, lang, core.config.curCodeTheme)
        }
      }
    }
    if (stack.length) {
      const loadLang = stack.map(s => s.lang as any)
      highlighter.loadLanguage(...loadLang).then(() => {
        stack.map(s => loadedLanguage.add(s.lang))
        stack.forEach(s => s.run())
        stack = []
        runInAction(() => store.refreshHighlight = !store.refreshHighlight)
      })
    }
  }, [])
  useMemo(() => {
    if (store?.pauseCodeHighlight) return
    parser()
  }, [editor.children, store?.pauseCodeHighlight])
  return null
})
