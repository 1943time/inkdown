import {Editor} from 'slate'
import {BackspaceKey} from './hotKeyCommands/backspace'

export const inlineNode = new Set(['media', 'inline-katex', 'break'])
const voidNode = new Set(['hr', 'break'])
export const withMarkdown = (editor: Editor) => {
  const {isInline, isVoid, deleteBackward, deleteFragment, deleteForward} = editor
  editor.isInline = element =>
    inlineNode.has(element.type) || isInline(element)

  editor.isVoid = (element) => {
    return voidNode.has(element.type) || isVoid(element)
  }

  return editor
}
