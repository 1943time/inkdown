import {ReactEditor, useSlate} from 'slate-react'
import {useCallback, useMemo} from 'react'
import {BaseElement, Editor, Path, Transforms} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'

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

export const useEditorUtils = (editor: Editor) => {
  return useMemo(() => new EditorUtils(), [editor])
}
