import {Editor} from 'slate'
import {BackspaceKey} from './hotKeyCommands/backspace'

const inlineNode = new Set(['media', 'inline-katex'])
export const withMarkdown = (editor: Editor) => {
  const {isInline, isVoid, deleteBackward, deleteFragment, deleteForward} = editor
  editor.isInline = element =>
    inlineNode.has(element.type) || isInline(element)
  const back = new BackspaceKey(editor)

  editor.isVoid = (element) => {
    return ['hr'].includes(element.type) || isVoid(element)
  }

  editor.deleteBackward = (unit) => {
    if (back.run()) return
    deleteBackward(unit)
  }

  editor.deleteFragment = (direction) => {
    if (back.range()) return
    deleteFragment(direction)
  }

  editor.deleteForward = (unit) => {
    deleteForward(unit)
  }
  return editor
}
