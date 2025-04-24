import { NoteStore } from '@/store/note/note'
import { TabStore } from '@/store/note/tab'
import { Editor, Node, Transforms } from 'slate'

export const inlineNode = new Set(['inline-katex', 'break', 'wiki-link'])
const voidNode = new Set(['hr', 'break'])
export const withMarkdown = (editor: Editor, store: TabStore) => {
  const { isInline, isVoid, apply } = editor
  editor.isInline = (element) => inlineNode.has(element.type) || isInline(element)

  editor.isVoid = (element) => {
    return voidNode.has(element.type) || isVoid(element)
  }
  editor.apply = (operation) => {
    if (operation.type === 'merge_node' && operation.properties?.type === 'table-cell') return
    if (!store.manual) {
      if (operation.type === 'move_node') {
        const node = Node.get(editor, operation.path)
        if (node?.type === 'table-cell') return
      }
      if (operation.type === 'remove_node') {
        const { node } = operation
        if (['table-row', 'table-cell'].includes(node.type)) {
          if (node.type === 'table-cell') {
            Transforms.insertFragment(editor, [{ text: '' }], {
              at: {
                anchor: Editor.start(editor, operation.path),
                focus: Editor.end(editor, operation.path)
              }
            })
          }
          if (node.type === 'table-row') {
            for (let i = 0; i < node.children?.length; i++) {
              Transforms.insertFragment(editor, [{ text: '' }], {
                at: {
                  anchor: Editor.start(editor, [...operation.path, i]),
                  focus: Editor.end(editor, [...operation.path, i])
                }
              })
            }
          }
          return
        }
      }
    }
    apply(operation)
  }
  return editor
}
