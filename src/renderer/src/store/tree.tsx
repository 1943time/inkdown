import {action, makeAutoObservable, observable, runInAction} from 'mobx'
import {GetFields, IFileItem, ISpaceNode, Tab} from '../index'
import {createFileNode, defineParent, insertFile, ReadSpace} from './parserNode'
import {nanoid} from 'nanoid'
import {basename, join} from 'path'
import {existsSync, readdirSync, readFileSync, statSync} from 'fs'
import {MainApi} from '../api/main'
import {MenuKey} from '../utils/keyboard'
import {message$, nid, stat} from '../utils'
import {Watcher} from './watch'
import {Subject} from 'rxjs'
import {configStore} from './config'
import {db, IFile} from './db'
import {EditorStore} from '../editor/store'
import {openConfirmDialog$} from '../components/Dialog/ConfirmDialog'
import {Checkbox} from 'antd'
import {updateFilePath} from '../editor/utils/updateNode'
import {editSpace$} from '../components/space/EditSpace'
import {getLinkMap, refactorDepLink, refactorDepOnLink} from '../utils/refactor'
import {mediaType} from '../editor/utils/dom'
import {parserMdToSchema} from '../editor/parser/parser'
import {readFile} from 'fs/promises'

export class TreeStore {
  treeTab: 'folder' | 'search' | 'bookmark' = 'folder'
  nodeMap = new Map<string, IFileItem>()
  root: ISpaceNode | null = null
  ctxNode: IFileItem | null = null
  dragNode: IFileItem | null = null
  tabs: Tab[] = []
  dragStatus: null | {
    mode: 'enter' | 'top' | 'bottom'
    dropNode: IFileItem,
  } = null
  selectItem: IFileItem | null = null
  openQuickly = false
  searchKeyWord = ''
  currentIndex = 0
  width = 280
  loading = false
  size = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  fold = true
  watcher: Watcher
  recordTimer = 0
  externalChange$ = new Subject<IFileItem>()
  shareFolder$ = new Subject<string>()

  get nodes() {
    return Array.from(this.nodeMap.values())
  }

  get currentTab() {
    return this.tabs[this.currentIndex]
  }

  get openedNote() {
    return this.tabs[this.currentIndex].current
  }

  get firstNote() {
    let firstNote: IFileItem | null = null
    let stack = this.root?.children?.slice() || []
    while (stack.length) {
      const item = stack.shift()!
      if (!item.folder && ['md', 'markdown'].includes(item.ext!)) {
        firstNote = item
        break
      }
      if (item.folder && item.children?.length) {
        stack.unshift(...item.children.slice())
      }
    }
    return firstNote
  }

  constructor() {
    this.watcher = new Watcher(this)
    makeAutoObservable(this, {
      watcher: false,
      recordTimer: false
    })
    window.addEventListener('resize', action(() => {
      this.size = {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }))
    window.addEventListener('click', e => {
      if (this.selectItem) {
        runInAction(() => {
          this.selectItem = null
        })
      }
    })
    this.tabs.push(this.createTab())
    new MenuKey(this)
    window.electron.ipcRenderer.on('open-path', async (e, path: string) => {
      if (existsSync(path)) {
        const s = stat(path)
        if (s && !s.isDirectory()) {
          if (this.root && path.startsWith(this.root.filePath)) {
            const node = await insertFile(this, {
              spaceId: this.root.cid,
              folder: false,
              filePath: path
            })
            if (node) this.openExternalNode(node)
          } else {
            const record = await db.file.where('filePath').equals(path).first()
            if (record) {
              if (record.updated === s.mtime.valueOf()) {
                this.openExternalNode(createFileNode(record))
              } else {
                if (mediaType(record.filePath) === 'markdown') {
                  const [schema] = await parserMdToSchema([await readFile(record.filePath, {encoding: 'utf-8'})])
                  db.file.update(record.cid, {
                    schema: schema,
                    updated: s.mtime.valueOf()
                  })
                  record.schema = schema
                  this.openExternalNode(createFileNode(record))
                }
              }
            } else {
              const id = nid()
              const now = Date.now()
              const data:IFile = {
                cid: id,
                filePath: path,
                folder: s.isDirectory(),
                sort: 0,
                created: now,
                updated: s.mtime.valueOf()
              }
              if (mediaType(path) === 'markdown') {
                const [schema] = await parserMdToSchema([await readFile(path, {encoding: 'utf-8'})])
                data.schema = schema
              }
              db.file.add(data)
              this.openExternalNode(createFileNode(data))
            }
          }
        }
      }
    })
  }
  openExternalNode(node: IFileItem) {
    if (!this.tabs.some((t, i) => {
      if (!t.current) {
        this.currentIndex = i
        this.openNote(node)
        return true
      }
      return false
    })) {
      this.appendTab(node)
    }
  }
  moveToTrash(item: IFileItem, force = false) {
    try {
      if (item) {
        this.selectItem = null
        if (configStore.config.showRemoveFileDialog && !force) {
          let save = false
          openConfirmDialog$.next({
            title: configStore.zh ? `确认删除${item.folder ? '文件夹' : '文件'} '${item.filename}'` : `Are you sure you want to delete '${item.filename}' ${item.folder ? 'and its contents?' : '?'}`,
            description: configStore.zh ? '您可以从垃圾箱中恢复此文件。' : 'You can restore this file from the Trash.',
            onConfirm: () => {
              treeStore.moveToTrash(item, true)
              if (save) {
                configStore.setConfig('showRemoveFileDialog', false)
              }
            },
            okText: configStore.zh ? '移入垃圾箱' : 'Move To Trash',
            footer: (
              <Checkbox
                defaultChecked={save}
                className={'mt-6'}
                onChange={e => save = e.target.checked}>
                {configStore.zh ? '不再询问' : 'Do not ask me again'}
              </Checkbox>
            )
          })
        } else {
          this.removeSelf(item)
          MainApi.moveToTrash(item.filePath)
          this.removeDirData(item)
          if (this.selectItem) this.selectItem = null
          if (this.ctxNode) this.ctxNode = null
        }
      }
    } catch (e) {
      MainApi.errorLog(e, {name: 'moveToTrash'})
    }
  }
  removeDirData(item: IFileItem) {
    const stack = [item]
    const removeHistory:string[] = []
    while (stack.length) {
      const cur = stack.pop()!
      if (cur.folder && cur.children) {
        stack.push(...cur.children)
      }
      if (cur.ext === 'md') {
        removeHistory.push(cur.cid)
      }
    }
    if (removeHistory.length) {
      db.history.where('fileId').anyOf(removeHistory).delete()
    }
  }
  navigatePrev() {
    if (this.currentTab.hasPrev) {
      this.currentTab.index--
    }
  }

  navigateNext() {
    if (this.currentTab.hasNext) {
      this.currentTab.index++
    }
  }
  updateTitle() {
    if (this.openedNote) {
      if (this.root) {
        document.title = `${this.root.name}-${this.openedNote.filename}`
      } else {
        document.title = this.openedNote.filename
      }
    } else {
      document.title = 'Bluestone'
    }
  }
  async restoreTabs() {
    if (!this.root) return
    const files = await db.recent.orderBy('sort').filter(x => x.spaceId === this.root!.cid).toArray()
    if (files.length) {
      runInAction(() => {
        this.tabs = []
        let index = 0
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          this.appendTab(this.nodeMap.get(f.fileId))
          if (f.current) index = i
        }
        this.currentIndex = index
      })
    } else {
      const first = this.firstNote
      if (first) this.openNote(first)
    }
    if (this.openedNote) {
      this.openParentDir(this.openedNote)
    }
  }

  setState<T extends GetFields<TreeStore>>(value: { [P in T]: TreeStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }

  openParentDir(item: IFileItem) {
    while (item.parent) {
      item.parent.expand = true
      item = item.parent
    }
  }

  openNote(file: IFileItem, scroll = true) {
    if (this.currentTab.current?.filePath === file.filePath) return
    const index = this.tabs.findIndex(t => t.current?.filePath === file.filePath)
    if (index !== -1) {
      return this.selectTab(index)
    }
    if (file.ext === 'md') {
      const now = Date.now()
      db.file.update(file.cid, {lastOpenTime: now})
      file.lastOpenTime = now
    }
    this.currentTab.history = this.currentTab.history.filter(t => t.filePath !== file.filePath)
    this.currentTab.history.push(file)
    this.openParentDir(file)
    this.currentTab.index = this.currentTab.history.length - 1
    this.currentTab.store.editor.selection = null
    const now = Date.now()
    db.file.update(file.cid, {
      lastOpenTime: now
    })
    file.lastOpenTime = now
    this.recordTabs()
    this.updateTitle()
  }

  async recordTabs() {
    clearTimeout(this.recordTimer)
    this.recordTimer = window.setTimeout(async () => {
      if (this.root) {
        await db.recent.where('spaceId').equals(this.root.cid).delete()
      }
      let i = 0
      for (let t of this.tabs) {
        if (!t.current) continue
        await db.recent.add({
          id: nid(),
          spaceId: t.current.spaceId,
          current: t.current === this.openedNote,
          fileId: t.current.cid,
          sort: i
        })
        i++
      }
    }, 300)
  }
  async moveNode() {
    if (this.dragNode && this.dragStatus && this.dragStatus.dropNode !== this.dragNode) {
      if (!this.dragNode.parent) return
      const {dropNode, mode} = this.dragStatus
      if (!dropNode) return
      const dragNode = this.dragNode
      let targetList = dropNode.parent?.children!
      let index = targetList.findIndex(l => l === dropNode)
      this.dragNode = null
      this.dragStatus = null
      if (mode === 'top' && targetList[index - 1] === dragNode) return
      if (mode === 'bottom' && targetList[index + 1] === dragNode) return
      const oldPath = dragNode.filePath
      dragNode.parent!.children = dragNode.parent!.children!.filter(c => c !== dragNode)
      if (dragNode.parent === dropNode.parent) {
        targetList = targetList.filter(c => c !== dragNode)
        index = targetList.findIndex(l => l === dropNode)
      }
      if (mode === 'bottom' || mode === 'top') {
        targetList.splice(mode === 'top' ? index : index + 1, 0, dragNode)
        dropNode.parent!.children = targetList
        if (dragNode.parent !== dropNode.parent) {
          const linkMap = getLinkMap(this)
          const newPath = join(dropNode.parent!.filePath, basename(dragNode.filePath))
          await updateFilePath(dragNode, newPath)
          defineParent(dragNode, dropNode.parent!)
          refactorDepLink(linkMap, dragNode)
          refactorDepOnLink(linkMap, dragNode, oldPath)
        }
        targetList.map((n, i) => db.file.update(n.cid, {sort: i}))
      }
      if (mode === 'enter' && dropNode.folder) {
        const linkMap = getLinkMap(this)
        dropNode.children!.unshift(dragNode)
        const newPath = join(dropNode.filePath, basename(dragNode.filePath))
        defineParent(dragNode, dropNode)
        await updateFilePath(dragNode, newPath)
        dropNode.children!.map((n, i) => db.file.update(n.cid, {sort: i}))
        refactorDepLink(linkMap, dragNode)
        refactorDepOnLink(linkMap, dragNode, oldPath)
      }
    } else {
      this.dragNode = null
      this.dragStatus = null
    }
  }

  checkOtherTabsShouldUpdate() {
    if (this.currentTab.current?.ext === 'md' && this.tabs.length > 1) {
      const path = this.currentTab.current?.filePath
      this.tabs.forEach((t) => {
        if (this.currentTab !== t && t.current?.filePath === path) {
          this.externalChange$.next(t.current)
        }
      })
    }
  }

  selectTab(i: number) {
    this.checkOtherTabsShouldUpdate()
    this.currentTab.store.saveDoc$.next(null)
    this.currentIndex = i
    this.selectItem = null
    setTimeout(() => {
      const backRange = this.currentTab.range
      if (backRange) {
        const selection = window.getSelection()!
        selection.removeAllRanges()
        selection.addRange(backRange)
      }
      this.updateTitle()
    })
    this.recordTabs()
  }

  async initial(spaceId: string) {
    this.fold = false
    const space = await db.space.get(spaceId)
    if (space && !existsSync(space.filePath)) {
      try {
        if (!existsSync(space.filePath)) {
          return openConfirmDialog$.next({
            title: 'Space folder has been removed!',
            okText: 'Change file path',
            onConfirm: () => {
              editSpace$.next(spaceId)
            }
          })
        }
        readdirSync(space.filePath)
      } catch (e) {
        const res = await MainApi.openFolder(space.filePath)
        if (!res.filePaths.length) return
        if (res.filePaths[0] !== space.filePath) {
          return openConfirmDialog$.next({
            title: 'Space folder has been removed!',
            okText: 'Change file path',
            onConfirm: () => {
              editSpace$.next(spaceId)
            }
          })
        }
      }
    }
    const read = new ReadSpace(spaceId)
    const timer = setTimeout(action(() => this.loading = true), 100)
    const res = await read.getTree()
    clearTimeout(timer)
    if (res) {
      runInAction(() => {
        this.loading = false
        this.root = res.space
        this.nodeMap = res.nodeMap
      })
      db.space.update(spaceId, {
        lastOpenTime: Date.now()
      })
      setTimeout(() => {
        this.restoreTabs()
      }, 200)
    }
  }

  createTab() {
    return observable({
      get current() {
        return this.history[this.index]
      },
      history: [],
      index: 0,
      id: nanoid(),
      get hasPrev() {
        return this.index > 0
      },
      store: new EditorStore(),
      get hasNext() {
        return this.index < this.history.length - 1
      }
    } as Tab, {range: false, id: false})
  }

  appendTab(file?: IFileItem) {
    const index = this.tabs.findIndex(t => {
      return file && t.current === file
    })
    if (index !== -1) {
      this.currentIndex = index
    } else {
      if (this.tabs.length >= 30) {
        return message$.next({
          type: 'warning',
          content: 'Too many tabs open'
        })
      }
      const tab = this.createTab()
      this.tabs.push(tab)
      this.currentIndex = this.tabs.length - 1
      if (file) {
        this.openNote(file)
        const now = Date.now()
        db.file.update(file.cid, {
          lastOpenTime: now
        })
        file.lastOpenTime = now
        this.recordTabs()
      }
      requestIdleCallback(() => {
        document.querySelector('#nav-tabs')?.scroll({
          left: 10000
        })
      })
    }
  }

  removeTab(i: number) {
    this.currentTab.store.saveDoc$.next(null)
    if (this.tabs.length < 2) return
    this.tabs.splice(i, 1)
    if (i === this.currentIndex) {
      if (!this.tabs[this.currentIndex]) {
        this.currentIndex--
      }
    } else if (i < this.currentIndex) {
      this.currentIndex--
    }
    this.recordTabs()
  }
  private removeNodeFromHistory(node: IFileItem) {
    for (let t of this.tabs) {
      if (t.current === node) {
        t.store.editor.selection = null
      }
      if (t.history?.length) {
        t.history = t.history.filter(h => h !== node)
        if (t.history.length > 0 && t.index > t.history.length - 1) {
          t.index = t.history.length - 1
        } else if (!t.history.length) {
          t.index = 0
        }
      }
    }
  }
  private removeSelf(node: IFileItem) {
    if (!node.folder) this.removeNodeFromHistory(node)
    if (node.parent) {
      node.parent!.children = node.parent!.children!.filter(c => c !== node)
    }
    this.nodeMap.delete(node.cid)
    if (node.folder) {
      const stack = node.children!.slice()
      while (stack.length) {
        const item = stack.pop()!
        if (item.folder) {
          stack.push(...item.children!)
        } else {
          this.removeNodeFromHistory(item)
        }
        this.nodeMap.delete(item.cid)
      }
    }
  }
}

export const treeStore = new TreeStore()
