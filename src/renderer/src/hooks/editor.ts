import {ReactEditor, useSlate} from 'slate-react'
import {useCallback, useMemo, useState} from 'react'
import {BaseElement, Editor, Path, Transforms} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, useEditorStore} from '../editor/store'
import {useSubject} from './subscribe'
import {selChange$} from '../editor/plugins/useOnchange'
import {useSetState} from 'react-use'

export const useMEditor = (el: BaseElement) => {
  const editor = useSlate()

  const update = useCallback((props: Record<string, any>, current?: BaseElement) => {
    Transforms.setNodes(editor, props, {at: ReactEditor.findPath(editor, current || el)})
  }, [editor, el])

  const remove = useCallback((current?: BaseElement) => {
    const path = ReactEditor.findPath(editor, current || el)
    Transforms.delete(editor, {at: path})
    if (Path.equals([0], path) && !Editor.hasPath(editor, Path.next(path))) {
      const dom = ReactEditor.toDOMNode(editor, editor)
      dom.focus()
      Transforms.insertNodes(editor, {type: 'paragraph', children: [{text: ''}]}, {select: true})
    }
  }, [editor, el])

  return [editor, update, remove] as [typeof editor, typeof update, typeof remove]
}

export const useSelStatus = (element: BaseElement) => {
  const store = useEditorStore()
  const [state, setState] = useSetState({
    selected: false,
    path: ReactEditor.findPath(store.editor, element)
  })
  const path = useMemo(() => {
    return ReactEditor.findPath(store.editor, element)
  }, [element])
  useSubject(selChange$, ctx => {
    const path = ReactEditor.findPath(store.editor, element)
    setState({
      path,
      selected: Path.equals(ReactEditor.findPath(store.editor, element), ctx.node?.[1] || [])
    })
  }, [path, element])
  return [state.selected, state.path, store] as [boolean, Path, EditorStore]
}
