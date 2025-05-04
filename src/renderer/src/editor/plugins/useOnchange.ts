import { Editor, Element, Path, Range } from 'slate'
import { useMemo, useRef } from 'react'
import { TabStore } from '@/store/note/tab'
import { getDomRect } from '@/utils/dom'

const floatBarIgnoreNode = new Set(['code', 'inline-katex', 'wiki-link'])
export function useOnchange(tab: TabStore) {
  const rangeContent = useRef('')
  return useMemo(() => {
    return (setSelection = false) => {
      const sel = tab.editor.selection
      const [node] = Editor.nodes<Element>(tab.editor, {
        match: (n) => Element.isElement(n),
        mode: 'lowest'
      })
      if (!node) return
      if (
        sel &&
        !floatBarIgnoreNode.has(node[0].type) &&
        !Range.isCollapsed(sel) &&
        Path.equals(Path.parent(sel.focus.path), Path.parent(sel.anchor.path))
      ) {
        const domSelection = window.getSelection()
        const domRange = domSelection?.getRangeAt(0)
        const rect = getDomRect()
        const rangeStr = domRange?.toString() || ''
        if (rect && rangeContent.current !== rangeStr) {
          rangeContent.current = rangeStr
          tab.setState((state) => {
            state.domRect = rect
          })
        }
      } else if (tab.state.domRect) {
        rangeContent.current = ''
        tab.setState((state) => {
          state.domRect = null
        })
      }
      if (
        node &&
        node[0].type === 'wiki-link' &&
        node[0]?.children?.[0]?.text?.slice(0, sel?.anchor.offset).includes('|')
      ) {
        tab.setState((state) => {
          state.wikilink.open = false
        })
      } else {
        if (node && node[0].type === 'wiki-link' && !setSelection) {
          tab.keyboard.showWikiLink(node[0])
        } else if (tab.state.wikilink.open && (!setSelection || node[0].type !== 'wiki-link')) {
          tab.setState((state) => {
            state.wikilink = {
              open: false,
              left: 0,
              top: 0,
              keyword: '',
              offset: 0,
              mode: 'top'
            }
          })
        }

        if (tab.state.wikilink.open && node[0].type === 'wiki-link') {
          tab.setState((state) => {
            state.wikilink.offset = sel?.anchor.offset!
          })
        }
      }
      // if (node && node[0].type === 'media') {
      //   store.mediaNode$.next(node)
      // } else {
      //   store.mediaNode$.next(null)
      // }
    }
  }, [tab.editor])
}
