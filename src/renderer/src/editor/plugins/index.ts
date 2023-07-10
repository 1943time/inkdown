import {Editor, Element, Node, Path, Range, Transforms} from 'slate'
import {CodeLineNode} from '../../el'
import {htmlParser} from './htmlParser'
import {BackspaceKey} from './hotKeyCommands/backspace'
import {EditorUtils} from '../utils/editorUtils'

export const withMarkdown = (editor: Editor) => {
  const {isInline, isVoid, insertData, deleteBackward, deleteFragment, deleteForward} = editor
  editor.isInline = element =>
    ['media'].includes(element.type) || isInline(element)
  const back = new BackspaceKey(editor)
  editor.isVoid = (element) => {
    return ['hr'].includes(element.type) || isVoid(element)
  }
  editor.insertData = (data) => {
    // const html = data.getData('text/html')
    // if (html) {
    //   if (htmlParser(editor, html)) {
    //     return
    //   }
    // }
    insertData(data)
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
