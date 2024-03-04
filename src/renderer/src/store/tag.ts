import {makeAutoObservable, runInAction} from 'mobx'
import {db, ITag, ITagFile} from './db'
import {GetFields} from '../index'
import {basename} from 'path'
import {existsSync} from 'fs'
import isHotkey from 'is-hotkey'
import {Subject} from 'rxjs'

class TagStore {
  tree: ITag[] = []
  dropNode: ITag | null = null
  dragNode: ITagFile | null = null
  selectedItem: ITagFile | null = null
  ctxNode: ITagFile | ITag | null = null
  expandTags: string[] = []
  openEditTag$ = new Subject<null | ITag>()

  constructor() {
    makeAutoObservable(this)
    window.addEventListener('keydown', e => {
      if (isHotkey('mod+backspace', e) && this.selectedItem) {
        runInAction(() => {
          const parent = this.tree.find(t => t.id === this.selectedItem!.tagId)
          if (parent) parent.children = parent.children?.filter(c => c.id !== this.selectedItem!.id)
        })
        // db.tagFile.where('id').equals(this.selectedItem.id!).delete()
        this.selectedItem = null
      }
    })
    window.addEventListener('click', e => {
      if (this.selectedItem) {
        runInAction(() => {
          this.selectedItem = null
        })
      }
    })
    window.electron.ipcRenderer.on('tag-task', (e, task: string) => {
      if (!this.ctxNode) return
      // if (task === 'delete') {
      //   if ((this.ctxNode as ITag).title) {
      //     db.tag.where('id').equals(this.ctxNode.id!).delete()
      //     db.tagFile.where('tagId').equals(this.ctxNode.id!).delete()
      //     runInAction(() => {
      //       this.tree = this.tree.filter(t => t.id !== this.ctxNode!.id)
      //     })
      //   } else {
      //     const tagFile = this.ctxNode as ITagFile
      //     db.tagFile.where('id').equals(this.ctxNode.id!).delete()
      //     runInAction(() => {
      //       const parent = this.tree.find(t => t.id === tagFile.tagId)
      //       if (parent) parent.children = parent.children?.filter(c => c.id !== tagFile.id)
      //     })
      //   }
      // }
      if (task === 'rename') {
        this.openEditTag$.next(this.ctxNode as ITag)
      }
    })
  }
  moveTo(tag: ITag) {
    // const node = this.dragNode
    // if (node) {
    //   const parent = this.tree.find(t => t.id === node.tagId)
    //   if (parent) parent.children = parent.children?.filter(c => c.id !== node.id)
    //   tag.children = this.sortFiles([...tag.children || [], node])
    //   node.tagId = tag.id!
    //   db.tagFile.where('id').equals(node.id!).modify({
    //     tagId: tag.id
    //   })
    // }
    // this.dropNode = null
  }
  async init() {
    // const tags = this.sortTags(await db.tag.toArray())
    // for (let t of tags) {
    //   t.children = this.sortFiles(await db.tagFile.where('tagId').equals(t.id!).toArray()).filter(file => {
    //     if (existsSync(file.filePath)) {
    //       return true
    //     } else {
    //       db.tagFile.where('id').equals(file.id!).delete()
    //       return false
    //     }
    //   })
    // }
    // this.setState({tree: tags})
  }

  sortFiles(files: ITagFile[]) {
    // return files.sort((a, b) => basename(a.filePath) > basename(b.filePath) ? 1 : -1)
  }

  sortTags(tags: ITag[]) {
    return tags.sort((a, b) => a.title > b.title ? 1 : -1)
  }

  setState<T extends GetFields<TagStore>>(value: { [P in T]: TagStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }
}

export const tagStore = new TagStore()
