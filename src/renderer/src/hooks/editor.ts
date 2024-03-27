import {ReactEditor, useSlate} from 'slate-react'
import {useCallback, useMemo, useState} from 'react'
import {BaseElement, Editor, Path, Transforms} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import {EditorStore, useEditorStore} from '../editor/store'
import {useSubject} from './subscribe'
import {selChange$} from '../editor/plugins/useOnchange'
import {useGetSetState, useSetState} from 'react-use'

export const useMEditor = (el: BaseElement) => {
  const editor = useSlate()

  const update = useCallback((props: Record<string, any>, current?: BaseElement) => {
    Transforms.setNodes(editor, props, {at: ReactEditor.findPath(editor, current || el)})
  }, [editor, el])

  const remove = useCallback((current?: BaseElement) => {
    try {
      const path = ReactEditor.findPath(editor, current || el)
      Transforms.delete(editor, {at: path})
      if (Path.equals([0], path) && !Editor.hasPath(editor, Path.next(path))) {
        const dom = ReactEditor.toDOMNode(editor, editor)
        dom.focus()
        Transforms.insertNodes(editor, {type: 'paragraph', children: [{text: ''}]}, {select: true})
      }
    } catch (e) {
      console.error('remove note', e)
    }
  }, [editor, el])

  return [editor, update, remove] as [typeof editor, typeof update, typeof remove]
}

export const useSelStatus = (element: any) => {
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    selected: !store.initializing && ReactEditor.isFocused(store.editor),
    path: EditorUtils.findPath(store.editor, element)
  })

  useSubject(selChange$, ctx => {
    const path = EditorUtils.findPath(store.editor, element)
    if (!ctx) {
      return setState({
        selected: false,
        path
      })
    }
    setState({
      path,
      selected: Path.equals(path, ctx.node?.[1] || [])
    })
  }, [element])
  return [state().selected, state().path, store] as [boolean, Path, EditorStore]
}
