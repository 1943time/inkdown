import {Editor, Element, Path, Range, NodeEntry, BaseSelection, Text, Node, Transforms} from 'slate'
import {useMemo, useRef} from 'react'
import {EditorStore, useEditorStore} from '../store'
import {MainApi} from '../../api/main'
import {EditorUtils} from '../utils/editorUtils'
import {runInAction} from 'mobx'
import {Subject} from 'rxjs'
import {parserMdToSchema} from '../parser/parser'
import {configStore} from '../../store/config'
export const selChange$ = new Subject<{sel: BaseSelection, node: NodeEntry<any>}>()
const floatBarIgnoreNode = new Set(['code-line', 'inline-katex'])
export function useOnchange(editor: Editor, store: EditorStore) {
  const rangeContent = useRef('')
  const currentType = useRef('')
  const curText = useRef<NodeEntry>()
  return useMemo(() => {
    return (value: any) => {
      const sel = editor.selection
      const [node] = Editor.nodes<Element>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      if (configStore.config.detectionMarkdown) {
        const [text] = Editor.nodes(editor, {
          match: n => Text.isText(n),
          mode: 'lowest'
        })

        if (text && curText.current && !Path.equals(text[1], curText.current[1]) && !EditorUtils.isDirtLeaf(curText.current[0])) {
          const text = Node.string(curText.current[0])
          const node = curText.current
          if (text) {
            parserMdToSchema([text]).then(res => {
              try {
                const frame = res[0]?.[0]?.children || []
                if (frame.length > 1 || (frame.length === 1 && (EditorUtils.isDirtLeaf(frame[0]) || frame[0].type))) {
                  Transforms.insertFragment(editor, frame, {
                    at: {
                      anchor: {path: node[1], offset: 0},
                      focus: {path: node[1], offset: text.length}
                    }
                  })
                }
              } catch (e) {
                console.error('detection markdown', e)
              }
            })
          }
        }
        if (text && ['paragraph', 'table-cell'].includes(node[0].type)) curText.current = text
      }

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
