import {BaseOperation, BaseSelection, Editor, Element, NodeEntry, Path, Range} from 'slate'
import {useMemo, useRef} from 'react'
import {EditorStore} from '../store'
import {runInAction} from 'mobx'
import {Subject} from 'rxjs'

export const selChange$ = new Subject<{sel: BaseSelection, node: NodeEntry<any>} | null>()
const floatBarIgnoreNode = new Set(['code', 'inline-katex'])
export function useOnchange(editor: Editor, store: EditorStore) {
  const rangeContent = useRef('')
  return useMemo(() => {
    return (value: any, operations: BaseOperation[]) => {
      const sel = editor.selection
      const [node] = Editor.nodes<Element>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      setTimeout(() => {
        selChange$.next({
          sel, node
        })
      })

      runInAction(() => store.sel = sel)
      if (!node) return
      setTimeout(() => {
        selChange$.next({
          sel, node
        })
      })
      if (sel && !floatBarIgnoreNode.has(node[0].type) &&
        !Range.isCollapsed(sel) &&
        Path.equals(Path.parent(sel.focus.path), Path.parent(sel.anchor.path))
      ) {
        const domSelection = window.getSelection()
        const domRange = domSelection?.getRangeAt(0)
        if (rangeContent.current === domRange?.toString()) {
          return store.setState(state => state.refreshFloatBar = !state.refreshFloatBar)
        }
        rangeContent.current = domRange?.toString() || ''
        const rect = domRange?.getBoundingClientRect()
        if (rect) {
          store.setState(state => state.domRect = rect)
        }
      } else if (store.domRect) {
        rangeContent.current = ''
        store.setState(state => state.domRect = null)
      }

      if (node && node[0].type === 'media') {
        store.mediaNode$.next(node)
      } else {
        store.mediaNode$.next(null)
      }
      if (node && node[0].type === 'table-cell') {
        store.setState(state => {
          state.tableCellNode = node
          state.refreshTableAttr = !state.refreshTableAttr
        })
      } else if (store.tableCellNode) {
        store.setState(state => {
          state.tableCellNode = null
          state.refreshTableAttr = !state.refreshTableAttr
        })
      }
    }
  }, [editor])
}
