import {Editor} from 'slate'
import {MainApi} from '../../api/main'
const tryCatchCallback =
  (editorFunc: any, editor: Editor) =>
    (...editorFuncArgs: any) => {
      try {
        return editorFunc(...editorFuncArgs)
      } catch (error) {
        if (error instanceof Error) {
          MainApi.errorLog(error, {operation: editor.operations, name: 'slate-error'})
        }
        editor.undo()
      }
    }
export const withErrorReporting = (editor: any): Editor => {
  Object.entries(editor).forEach(([key, value]) => {
    if (typeof value === 'function') {
      editor[key] = tryCatchCallback(value, editor)
    }
  })

  return editor as Editor
}
