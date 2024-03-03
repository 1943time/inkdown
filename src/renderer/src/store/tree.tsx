import {action, makeAutoObservable, observable, runInAction} from 'mobx'
import {GetFields, IFileItem, ISpaceNode, Tab} from '../index'
import {createFileNode, defineParent, ReadSpace, sortFiles} from './parserNode'
import {nanoid} from 'nanoid'
import {basename, join, parse, sep} from 'path'
import {appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync} from 'fs'
import {MainApi} from '../api/main'
import {MenuKey} from '../utils/keyboard'
import {message$, stat} from '../utils'
import {Watcher} from './watch'
import {Subject} from 'rxjs'
import {mediaType} from '../editor/utils/dom'
import {configStore} from './config'
import {appendRecentDir, appendRecentNote, db, ISpace, removeFileRecord} from './db'
import {refactor, renameAllFiles} from './refactor'
import {EditorStore} from '../editor/store'
import {parserMdToSchema} from '../editor/parser/parser'
import {shareStore} from '../server/store'
import isHotkey from 'is-hotkey'
import {EditorUtils} from '../editor/utils/editorUtils'
import {openConfirmDialog$} from '../components/Dialog/ConfirmDialog'
import {Checkbox} from 'antd'
import {updateFilePath, updateNode} from '../editor/utils/updateNode'
import {editSpace$} from '../components/space/EditSpace'

export class TreeStore {
  treeTab: 'folder' | 'search' | 'bookmark' = 'folder'
  nodeMap = new Map<string, IFileItem>()
  root: ISpaceNode | null = null
  ctxNode: IFileItem | null = null
  dragNode: IFileItem | null = null
  dropNode: IFileItem | ISpaceNode | null = null
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
  tabContextIndex = 0
  loading = false
  size = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  fold = true
  watcher: Watcher
  externalChange$ = new Subject<string>()
  shareFolder$ = new Subject<string>()
  moveFile$ = new Subject<{
    from: string
    to: string
  }>()

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
      watcher: false
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
    window.electron.ipcRenderer.on('copy-source-code', (e, filePath?: string) => {
      if (this.openedNote?.filePath.endsWith('.md') || filePath) {
        const content = readFileSync(filePath || this.currentTab!.current!.filePath, {encoding: 'utf-8'})
        window.api.copyToClipboard(content)
        message$.next({type: 'success', content: configStore.zh ? '已复制到剪贴板' : 'Copied to clipboard'})
      }
    })

    window.electron.ipcRenderer.on('open-path', (e, path: string) => {
      const s = stat(path)
      if (s) {
        if (s.isDirectory()) {
          if (path !== treeStore.root?.filePath) this.openFolder(path)
        } else {
          if (!treeStore.tabs.some(t => t.current?.filePath === path)) {
            // this.appendTab(path)
          }
        }
      }
    })
    window.electron.ipcRenderer.on('tree-command', (e, params: {
      type: 'rootFolder' | 'file' | 'folder'
      filePath: string
      command: 'createNote' | 'createFolder' | 'delete' | 'rename' | 'openInNewTab' | 'shareFolder' | 'newCopy'
    }) => {
      this.command(params)
    })
  }
  // insertFiles(files: FileList | string[], item: IFileItem, mode: 'cut' | 'copy' = 'cut') {
  //   if (item?.folder) {
  //     try {
  //       const folder = item.folder
  //       if (folder) {
  //         for (let f of files) {
  //           const path = typeof f === 'string' ? f : f.path
  //           if (path && path !== item.filePath && !path.startsWith(this.root.filePath)) {
  //             const target = join(item.filePath, basename(path))
  //             if (mode === 'cut') {
  //               renameSync(path, target)
  //             } else {
  //               cpSync(path, target, {recursive: true})
  //             }
  //             this.watcher.onChange('update', target)
  //           }
  //         }
  //       }
  //       this.parseFolder()
  //     } catch (e: any) {
  //       message$.next({
  //         type: 'warning',
  //         content: e?.message || 'Failed to insert file'
  //       })
  //     }
  //   }
  // }
  command(params: {
    type?: 'rootFolder' | 'file' | 'folder'
    filePath: string
    command: 'createNote' | 'createFolder' | 'delete' | 'rename' | 'openInNewTab' | 'shareFolder' | 'newCopy'
  }) {
    const {filePath} = params
    switch (params.command) {
      case 'createNote':
        // let addNote = createFileNode({
        //   folder: false,
        //   editName: 'untitled',
        //   parent: this.ctxNode || this.root,
        //   mode: 'create',
        //   filePath: ''
        // })
        // if (!this.ctxNode) {
        //   this.root.children!.unshift(addNote)
        // } else {
        //   this.ctxNode.children!.unshift(addNote)
        // }
        // addNote.parent!.expand = true
        break
      case 'createFolder':
        // const addFolder = createFileNode({
        //   folder: true,
        //   parent: this.ctxNode || this.root,
        //   mode: 'create',
        //   filePath: ''
        // })
        // if (!this.ctxNode) {
        //   this.root.children!.unshift(addFolder)
        // } else {
        //   this.ctxNode.children!.unshift(addFolder)
        // }
        break
      case 'rename':
        // if (this.ctxNode) {
        //   this.ctxNode.mode = 'edit'
        //   this.ctxNode.editName = this.ctxNode.filename
        // }
        break
      case 'openInNewTab':
        if (this.ctxNode?.filePath) this.appendTab(this.ctxNode)
        break
      case 'newCopy':
        // if (this.ctxNode && !this.ctxNode.folder) {
        //   let addNote = createFileNode({
        //     folder: false,
        //     editName: `${this.ctxNode.filename}_copy`,
        //     parent: this.ctxNode.parent,
        //     mode: 'copy',
        //     copyItem: this.ctxNode,
        //     filePath: ''
        //   })
        //   this.ctxNode.parent?.children!.unshift(addNote)
        //   addNote.parent!.expand = true
        // }
        break
      case 'shareFolder':
        if (this.ctxNode?.filePath || params.type === 'rootFolder') {
          // this.shareFolder$.next(params.type === 'rootFolder' ? treeStore.root?.filePath : this.ctxNode?.filePath!)
        }
        break
      case 'delete':
        if (filePath && this.ctxNode) {
          this.moveToTrash(this.ctxNode)
        }
        break
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
          if (!item.folder) db.history.where('filePath').equals(item.filePath).delete()
          if (this.selectItem) this.selectItem = null
          if (this.ctxNode) this.ctxNode = null
        }
      }
    } catch (e) {
      MainApi.errorLog(e, {name: 'moveToTrash'})
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

  // async restoreTabs(tabs: string[]) {
  //   const nodeMap = new Map(this.nodes.map(n => [n.filePath, n]))
  //   let first = true
  //   for (let t of tabs) {
  //     const tab = this.createTab()
  //     if (nodeMap.get(t)) {
  //       tab.history.push(nodeMap.get(t)!)
  //     } else {
  //       const st = stat(t)
  //       if (st && !st.isDirectory()) {
  //         const node = this.createSingleNode(t)
  //         tab.history.push(node)
  //       }
  //     }
  //     first ? this.tabs[0] = tab : this.tabs.push(tab)
  //     first = false
  //   }
  //   if (this.currentTab.current?.filePath) this.openParentDir(this.currentTab.current)
  // }

  setState<T extends GetFields<TreeStore>>(value: { [P in T]: TreeStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }

  // async getSchema(file: IFileItem, force = false) {
  //   if (file?.ext !== 'md' && file?.ext !== 'markdown') return
  //   if (file.schema && !force) return file
  //   const [schema] = await parserMdToSchema([readFileSync(file.filePath, {encoding: 'utf-8'})])
  //   file.schema = schema?.length ? schema : [EditorUtils.p]
  //   if (force && file === this.openedNote) {
  //     this.externalChange$.next(file.filePath)
  //   }
  //   return file
  // }

  openParentDir(item: IFileItem) {
    while (item.parent) {
      item.parent.expand = true
      item = item.parent
    }
  }

  // createSingleNode(filePath: string) {
  //   const node = createFileNode({
  //     filePath: filePath,
  //     folder: false
  //   })
  //   const media = mediaType(filePath)
  //   if (media === 'markdown' && (!this.root || !filePath.startsWith(this.root.filePath))) {
  //     this.watcher.watchNote(filePath)
  //   }
  //   return node
  // }

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
    const now = Date.now()
    db.file.update(file.cid, {
      lastOpenTime: now
    })
    file.lastOpenTime = now
    this.recordTabs()
    // if (this.root && filePath.startsWith(this.root.filePath)) {
    //   let item = typeof file === 'string' ? undefined : file
    //   if (!item) {
    //     const nodeMap = new Map(this.nodes.map(n => [n.filePath, n]))
    //     item = nodeMap.get(filePath)
    //     if (!item) {
    //       if (!existsSync(filePath)) appendFileSync(filePath, '', {encoding: 'utf-8'})
    //       const parent = nodeMap.get(join(filePath, '..'))
    //       item = createFileNode({
    //         filePath: filePath,
    //         folder: false,
    //         parent: parent
    //       })
    //       if (parent) parent.children = sortFiles([...parent.children!, item])
    //     }
    //   }
    //   if (item.ext === 'md' && this.root) appendRecentNote(item.filePath, this.root.filePath)
    //   this.currentTab.history = this.currentTab.history.slice(0, this.currentTab.index + 1)
    //   this.currentTab.history.push(item)
    //   this.openParentDir(item)
    //   document.title = this.root.filename + '-' + item.filename
    //   this.currentTab.index = this.currentTab.history.length - 1
    //   if (this.currentTab.store?.openSearch) this.currentTab.store.setSearchText(this.currentTab.store.search.text)
    //   if (scroll) {
    //     this.currentTab.store!.container?.scroll({
    //       top: 0
    //     })
    //   }
    // } else {
    //   const index = this.currentTab.history.findIndex(f => f.filePath === filePath)
    //   if (index !== -1) {
    //     this.currentTab.index = index
    //   } else {
    //     if (!existsSync(filePath)) {
    //       appendFileSync(filePath, '', {encoding: 'utf-8'})
    //     }
    //     const node = this.createSingleNode(filePath)
    //     document.title = node.filename
    //     this.currentTab.history.push(node)
    //     this.currentTab.index = this.currentTab.history.length - 1
    //   }
    // }
    // this.recordTabs()
  }

  openFolder(dirPath: string) {
    // this.watcher.destroy()
    // MainApi.setWin({openFolder: dirPath})
    // const {root} = parserNode(dirPath)
    // this.root = root
    // const pathMap = new Map(this.nodes.map(f => [f.filePath, f]))
    // for (let t of this.tabs) {
    //   for (let f of t.history) {
    //     if (f.filePath.startsWith(this.root.filePath)) {
    //       const parentPath = join(f.filePath, '..')
    //       if (pathMap.get(parentPath)) {
    //         defineParent(f, pathMap.get(parentPath)!)
    //       }
    //     }
    //   }
    // }
    // appendRecentDir(dirPath)
    // setTimeout(action(() => this.fold = false), 100)
    // this.watcher.openDirCheck()
    // this.parseFolder()
  }

  openFirst() {
    if (!treeStore.currentTab.current || this.tabs.length === 1) {
      const first = this.firstNote
      if (first) {
        this.openNote(first)
        this.openParentDir(first)
      }
    }
  }

  async parseFolder() {
    // const queue: IFileItem[] = []
    // const stack: IFileItem[] = this.root.children!.slice()
    // while (stack.length) {
    //   const item = stack.shift()!
    //   if (item.folder) {
    //     stack.unshift(...item.children?.slice() || [])
    //   } else if (['md', 'markdown'].includes(item.ext!) && !item.schema?.length) {
    //     queue.push(item)
    //   }
    // }
    // const files: string[] = []
    // for (let f of queue) {
    //   files.push(await window.api.fs.readFile(f.filePath, {encoding: 'utf-8'}))
    // }
    // const schemas = await parserMdToSchema(files)
    // queue.map((f, i) => {
    //   if (!f.schema) f.schema = schemas[i]
    // })
  }

  recordTabs() {
    MainApi.setWin({
      openTabs: this.tabs.filter(t => !!t.current).map(t => t.current!.filePath),
      index: this.currentIndex
    })
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
      dragNode.parent!.children = dragNode.parent!.children!.filter(c => c !== dragNode)
      if (dragNode.parent === dropNode.parent) {
        targetList = targetList.filter(c => c !== dragNode)
        index = targetList.findIndex(l => l === dropNode)
      }
      if (mode === 'bottom' || mode === 'top') {
        targetList.splice(mode === 'top' ? index : index + 1, 0, dragNode)
        dropNode.parent!.children = targetList
        if (dragNode.parent !== dropNode.parent) {
          const newPath = join(dropNode.parent!.filePath, basename(dragNode.filePath))
          await updateFilePath(dragNode, newPath)
          defineParent(dragNode, dropNode.parent!)
        }
        targetList.map((n, i) => db.file.update(n.cid, {sort: i}))
      }
      if (mode === 'enter' && dropNode.folder) {
        dropNode.children!.unshift(dragNode)
        const newPath = join(dropNode.filePath, basename(dragNode.filePath))
        defineParent(dragNode, dropNode)
        await updateFilePath(dragNode, newPath)
        dropNode.children!.map((n, i) => db.file.update(n.cid, {sort: i}))
      }
    } else {
      this.dragNode = null
      this.dragStatus = null
    }
  }

  saveNote(file: IFileItem) {
    // const parent = file.parent!
    // if (file.mode === 'create' || file.mode === 'copy') {
    //   if (!file.editName) {
    //     parent.children = parent.children!.filter(c => c !== file)
    //   } else {
    //     let path = join(parent.filePath, file.editName)
    //     if (!file.folder && !path.endsWith('.md')) path += '.md'
    //     if (parent.children?.find(c => c.filePath === path) || existsSync(path)) return message$.next({
    //       type: 'warning',
    //       content: configStore.zh ? '文件名已存在' : 'The name already exists'
    //     })
    //     if (file.folder) {
    //       mkdirSync(path)
    //     } else {
    //       if (file.mode === 'copy') {
    //         appendFileSync(path, readFileSync(file.copyItem!.filePath, {encoding: 'utf-8'}), {encoding: 'utf-8'})
    //         file.schema = file.copyItem?.schema || [EditorUtils.p]
    //       } else {
    //         appendFileSync(path, '', {encoding: 'utf-8'})
    //       }
    //     }
    //     file.ext = 'md'
    //     file.mode = undefined
    //     file.children = file.folder ? [] : undefined
    //     file.filePath = path
    //     file.filename = file.editName
    //     file.editName = undefined
    //     file.copyItem = undefined
    //     if (!file.folder) this.openNote(file)
    //   }
    //   parent.children = sortFiles(parent.children!)
    // }
    // if (file.mode === 'edit') {
    //   if (!file.editName || file.editName === file.filename) {
    //     file.editName = ''
    //     file.mode = undefined
    //   } else {
    //     const p = parse(file.editName)
    //     const path = file.filePath
    //     file.filename = file.folder ? file.editName : p.name
    //     let newPath = join(path, '..', file.filename)
    //     if (!file.folder && file.ext) newPath += `.${file.ext}`
    //     file.filePath = newPath
    //     renameSync(path, newPath)
    //     if (file.folder) {
    //       renameAllFiles(file.filePath, file.children || [])
    //       console.log('check', path, newPath)
    //       db.checkRenameFolder(path, newPath)
    //     }
    //     this.checkDepends(path, newPath)
    //     this.moveFile$.next({
    //       from: path,
    //       to: newPath
    //     })
    //     file.mode = undefined
    //     if (file.ext === 'md') {
    //       removeFileRecord(path, newPath)
    //       db.tagFile.where('filePath').equals(path).modify({
    //         filePath: newPath
    //       })
    //     }
    //     if (file.ext === 'md' || file.folder) shareStore.renameFilePath(path, newPath)
    //   }
    // }
  }

  checkOtherTabsShouldUpdate() {
    if (this.currentTab.current?.ext === 'md' && this.tabs.length > 1) {
      const path = this.currentTab.current?.filePath
      this.tabs.forEach((t) => {
        if (this.currentTab !== t && t.current?.filePath === path) {
          this.externalChange$.next(t.current?.filePath)
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
      if (this.openedNote) {
        document.title = this.root ? `${basename(this.root.filePath)}-${basename(this.openedNote.filePath)}` : basename(this.openedNote.filePath)
      }
    })
    this.recordTabs()
  }

  refactorFolder(oldPath: string, targetPath: string) {
    const files = readdirSync(targetPath)
    let changeFiles: [string, string][] = []
    for (let f of files) {
      if (f.startsWith('.')) continue
      const path = join(targetPath, f)
      const stat = statSync(path)
      if (stat.isDirectory()) {
        changeFiles.push(...this.refactorFolder(join(oldPath, f), path))
      } else {
        changeFiles.push([join(oldPath, f), path])
      }
    }
    return changeFiles
  }

  async checkDepends(oldPath: string, targetPath: string) {
    // if (!configStore.config.autoRebuild) return
    // const stat = statSync(targetPath)
    // let updateFiles: IFileItem[] = []
    // if (stat.isDirectory()) {
    //   const changeFiles = this.refactorFolder(oldPath, targetPath)
    //   updateFiles = await refactor(changeFiles, this.root?.children || [])
    // } else {
    //   updateFiles = await refactor([[oldPath, targetPath]], this.root?.children || [])
    // }
    // const filesStr: string[] = []
    // for (let f of updateFiles) {
    //   filesStr.push(await window.api.fs.readFile(f.filePath, {encoding: 'utf-8'}))
    // }
    // const schemas = await parserMdToSchema(filesStr)
    // updateFiles.map((f, i) => {
    //   f.schema = schemas[i]
    //   this.externalChange$.next(f.filePath)
    // })
  }
  async initial(spaceId: string) {
    this.fold = false
    const space = await db.space.get(spaceId)
    if (space && !existsSync(space.filePath)) {
      return openConfirmDialog$.next({
        title: 'Space folder has been removed!',
        okText: 'Change file path',
        onConfirm: () => {
          editSpace$.next(spaceId)
        }
      })
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
    }
  }
  getAbsolutePath(file: IFileItem) {
    if (this.root && file.filePath.startsWith(this.root.filePath)) {
      return file.filePath.replace(this.root.filePath, '').split(sep).slice(1)
    } else {
      if (file.filePath.startsWith(configStore.homePath)) {
        return ['~', ...file.filePath.replace(configStore.homePath, '').split(sep).slice(1)]
      } else {
        return file.filePath.split(sep).slice(1)
      }
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
      return t.current === file
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

  private removeSelf(node: IFileItem) {
    for (let t of this.tabs) {
      if (t.history?.length) {
        t.history = t.history.filter(h => h !== node)
        if (t.history.length > 0 && t.index > t.history.length - 1) {
          t.index = t.history.length - 1
        } else if (!t.history.length) {
          t.index = 0
        }
      }
    }
    if (node.parent) {
      node.parent!.children = node.parent!.children!.filter(c => c !== node)
    }
    if (!this.openedNote || this.openedNote.ext !== '.md') {
      this.currentTab.store.editor.selection = null
    }
    this.nodeMap.delete(node.cid)
    if (node.folder) {
      const stack = node.children!.slice()
      while (stack.length) {
        const item = stack.pop()!
        if (item.folder) {
          stack.push(...item.children!)
        }
        this.nodeMap.delete(item.cid)
      }
    }
  }
}

export const treeStore = new TreeStore()
