import {Editor, Element, Path, Range, NodeEntry, BaseSelection} from 'slate'
import {useMemo, useRef} from 'react'
import {EditorStore, useEditorStore} from '../store'
import {MainApi} from '../../api/main'
import {EditorUtils} from '../utils/editorUtils'
import {runInAction} from 'mobx'
import {Subject} from 'rxjs'
export const selChange$ = new Subject<{sel: BaseSelection, node: NodeEntry<any>}>()
export function useOnchange(editor: Editor, store: EditorStore) {
  const rangeContent = useRef('')
  const currentType = useRef('')
  return useMemo(() => {
    return (value: any) => {
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
      if (currentType.current !== node[0].type) {
        currentType.current = node[0].type
        MainApi.setEditorContext(node[0].type, EditorUtils.isTop(editor, node[1]))
      }
      if (sel && node[0].type !== 'code-line' && node[0].type !== 'head' &&
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
