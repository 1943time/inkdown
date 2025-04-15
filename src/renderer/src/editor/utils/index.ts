import { ReactEditor, useSlate } from 'slate-react'
import { useCallback } from 'react'
import { BaseElement, Editor, Path, Range, Transforms } from 'slate'
import { useGetSetState } from 'react-use'
import { useTab } from '@/store/note/TabCtx'
import { EditorUtils } from './editorUtils'
import { useSubject } from '@/hooks/common'
import { TabStore } from '@/store/note/tab'
import { mediaType } from './dom'
import { extname } from 'path-browserify'
export const useMEditor = (el: BaseElement) => {
  const editor = useSlate()
  const update = useCallback(
    (props: Record<string, any>, current?: BaseElement) => {
      Transforms.setNodes(editor, props, { at: ReactEditor.findPath(editor, current || el) })
    },
    [editor, el]
  )

  const remove = useCallback(
    (current?: BaseElement) => {
      try {
        const path = ReactEditor.findPath(editor, current || el)
        Transforms.delete(editor, { at: path })
        if (Path.equals([0], path) && !Editor.hasPath(editor, Path.next(path))) {
          const dom = ReactEditor.toDOMNode(editor, editor)
          dom.focus()
          Transforms.insertNodes(
            editor,
            { type: 'paragraph', children: [{ text: '' }] },
            { select: true }
          )
        }
      } catch (e) {
        console.error('remove note', e)
      }
    },
    [editor, el]
  )

  return [editor, update, remove] as [typeof editor, typeof update, typeof remove]
}

export const useSelStatus = (element: any) => {
  const tab = useTab()
  const [state, setState] = useGetSetState({
    selected: false,
    path: EditorUtils.findPath(tab.editor, element)
  })

  useSubject(
    tab.selChange$,
    (selectedPath) => {
      const path = EditorUtils.findPath(tab.editor, element)
      if (!selectedPath) {
        return setState({
          path,
          selected: false
        })
      }
      setState({
        path,
        selected:
          tab.editor.selection && !Range.isCollapsed(tab.editor.selection)
            ? EditorUtils.include(tab.editor.selection!, path)
            : Path.equals(path, selectedPath)
      })
    },
    [element]
  )
  return [state().selected, state().path, tab] as [boolean, Path, TabStore]
}

export const getImageData = (path: string) => {
  if (window.api.fs.existsSync(path)) {
    if (window.api.dev && mediaType(path) === 'image') {
      const base64 = window.api.fs.readFileSync(path, { encoding: 'base64' })
      return `data:image/${extname(path).slice(1)};base64,${base64}`
    }
    return `file://${path}`
  }
  return path
}
