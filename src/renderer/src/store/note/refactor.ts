import { IDoc } from 'types/model'
import { Store } from '../store'
import { Node } from 'slate'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { join } from 'path-browserify'
import { runInAction } from 'mobx'
import { copy } from '@/utils/common'
export class Refactor {
  constructor(private readonly store: Store) {}
  async refactor(doc: IDoc, oldPath = '') {
    const curPath = this.store.note.getDocPath(doc).join('/')
    if (curPath === oldPath) {
      return
    }
    if (doc.folder) {
      for (const child of doc.children || []) {
        await this.refactor(child, join(oldPath, child.name))
      }
    } else {
      const docs = this.store.note.state.nodes
      for (const node of Object.values(docs)) {
        if (!node.folder && node.links?.includes(doc.id)) {
          let schema: any[] = []
          if (!node.schema) {
            const data = await this.store.model.getDoc(node.id)
            if (data) {
              schema = data.schema || []
            }
          } else {
            schema = copy(node.schema!)
          }
          const changed = this.refactorSchema({ schema, oldPath, newPath: curPath, docId: node.id })
          runInAction(() => {
            if (changed) {
              node.schema = schema
              this.store.note.externalChange$.next(node.id)
              this.store.model.updateDoc(node.id, { schema, updated: Date.now() })
              this.store.local.writeDoc(node)
            }
          })
        }
      }
    }
  }
  private refactorSchema({
    schema,
    oldPath,
    newPath,
    docId
  }: {
    schema: any[]
    oldPath: string
    newPath: string
    docId: string
  }) {
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
