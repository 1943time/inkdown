import { BaseOperation, BaseSelection, Editor, Element, NodeEntry, Path, Range } from 'slate'
import { useMemo, useRef } from 'react'
import { Subject } from 'rxjs'
import { TabStore } from '@/store/note/tab'

export const selChange$ = new Subject<Path | null>()
const floatBarIgnoreNode = new Set(['code', 'inline-katex'])
export function useOnchange(tab: TabStore) {
  const rangeContent = useRef('')
  return useMemo(() => {
    return () => {
      const sel = tab.editor.selection
      const [node] = Editor.nodes<Element>(tab.editor, {
        match: (n) => Element.isElement(n),
        mode: 'lowest'
      })
      setTimeout(() => {
        selChange$.next(node?.[1])
      })
      // runInAction(() => store.sel = sel)
      if (!node) return
      if (
        sel &&
        !floatBarIgnoreNode.has(node[0].type) &&
        !Range.isCollapsed(sel) &&
        Path.equals(Path.parent(sel.focus.path), Path.parent(sel.anchor.path))
      ) {
        const domSelection = window.getSelection()
        const domRange = domSelection?.getRangeAt(0)
        if (rangeContent.current === domRange?.toString()) {
          // runInAction(() => {
          //   store.refreshFloatBar = !store.refreshFloatBar
          // })
        }
        const rect = domRange?.getBoundingClientRect()
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

      // if (node && node[0].type === 'media') {
      //   store.mediaNode$.next(node)
      // } else {
      //   store.mediaNode$.next(null)
      // }
    }
  }, [tab.editor])
}
