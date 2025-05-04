import { IDoc } from 'types/model'
import { Store } from '../store'
import { Node } from 'slate'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { join } from 'path-browserify'
import { runInAction } from 'mobx'
import { copy } from '@/utils/common'
export class RefactorStore {
  constructor(private readonly store: Store) {}
  async refactor(doc: IDoc, oldParentPath = '') {
    const curPath = this.store.note.getDocPath(doc).join('/')
    const oldPath = join(oldParentPath, doc.name)
    if (curPath === oldPath) {
      return
    }
    if (doc.folder) {
      for (const child of doc.children || []) {
        await this.refactor(child, oldPath)
      }
    } else {
      const docs = this.store.note.state.nodes
      for (const [, node] of Object.entries(docs)) {
        if (node.links?.includes(doc.id)) {
          runInAction(() => {
            const schema = copy(node.schema)
            this.refactorSchema(schema!, oldPath, curPath)
            node.schema = schema
          })
        }
      }
    }
  }
  private refactorSchema(schema: any[], oldPath: string, newPath: string) {
    const stack = schema.slice()
    let changed = false
    while (stack.length) {
      const item = stack.pop()
      if (item.type === 'wiki-link') {
        const text = Node.string(item)
        const ps = EditorUtils.parseWikiLink(text)
        if (ps) {
          if (ps.docName.includes('/') && oldPath.includes(ps.docName)) {
            const newText = text.replace(oldPath, newPath)
            item.children = [{ text: newText }]
            changed = true
          } else if (!ps.docName.includes('/') && oldPath.split('/').pop() === ps.docName) {
            const newText = text.replace(oldPath.split('/').pop()!, newPath.split('/').pop()!)
            item.children = [{ text: newText }]
            changed = true
          }
        }
      }
      if (item.children?.length) {
        stack.push(...item.children)
      }
    }
    return changed
  }
}
