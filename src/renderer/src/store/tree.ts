import {action, makeAutoObservable, observable, runInAction} from 'mobx'
import {GetFields, IFileItem, Tab} from '../index'
import {createFileNode, parserNode, sortFiles} from './parserNode'
import {nanoid} from 'nanoid'
import {basename, join, parse} from 'path'
import {mkdirSync, appendFileSync, existsSync, renameSync, watch, statSync, readFileSync} from 'fs'
import {MainApi} from '../api/main'
import {markdownParser} from '../editor/parser'
import {MenuKey} from '../utils/keyboard'
import {message$, stat} from '../utils'
import {Watcher} from './watch'
import {Subject} from 'rxjs'
import {mediaType} from '../editor/utils/dom'
import {configStore} from './config'
import {appendRecentDir, appendRecentNote} from './db'
export class TreeStore {
  treeTab: 'folder' | 'search' = 'folder'
  root!: IFileItem
  ctxNode: IFileItem | null = null
  dragNode: IFileItem | null = null
  dropNode: IFileItem | null = null
  tabs: Tab[] = []
  searchKeyWord = ''
  currentIndex = 0
  width = 260
  size = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  schemaMap = new WeakMap<IFileItem, {
    history?: any,
    state: any[]
  }>()
  fold = true
  watcher: Watcher
  externalChange$ = new Subject<string>()
  get files() {
    if (!this.root) return []
    let files: IFileItem[] = []
    const stack:IFileItem[] = this.root.children!.slice()
    while (stack.length) {
      const node = stack.shift()!
      if (node.folder) {
        stack.push(...node.children!)
      } else {
        files.push(node)
      }
    }
    return files
  }

  get nodes() {
    if (!this.root) return []
    let nodes: IFileItem[] = [this.root]
    const stack:IFileItem[] = this.root.children!.slice()
    while (stack.length) {
      const node = stack.shift()!
      nodes.push(node)
      if (node.folder) {
        stack.push(...node.children!)
      }
    }
    return nodes
  }
  get currentTab() {
    return this.tabs[this.currentIndex]
  }

  get openNote() {
    return this.tabs[this.currentIndex].current
  }

  constructor() {
    this.watcher = new Watcher(this)
    makeAutoObservable(this, {
      schemaMap: false,
      watcher: false
    })
    window.addEventListener('resize', action(() => {
      this.size = {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }))
    this.appendTab()
    new MenuKey(this)
    window.electron.ipcRenderer.on('copy-source-code', (e, filePath?: string) => {
      if (this.openNote?.filePath.endsWith('.md') || filePath) {
        const content = readFileSync(filePath || this.currentTab!.current!.filePath, {encoding: 'utf-8'})
        window.api.copyToClipboard(content)
        message$.next({type: 'success', content: configStore.isZh ? '已复制到剪贴板~' : 'Copied to clipboard'})
      }
    })

    window.electron.ipcRenderer.on('open-path', (e, path: string) => {
      this.open(path)
    })
    window.electron.ipcRenderer.on('tree-command', (e, params: {
      type: 'rootFolder' | 'file' | 'folder'
      filePath: string
      command: 'createNote' | 'createFolder' | 'delete' | 'rename' | 'openInNewTab'
    }) => {
      runInAction(() => {
        const {filePath, type} = params
        this.watcher.pause()
        switch (params.command) {
          case 'createNote':
            const addNote = createFileNode({
              fileName: nanoid(),
              folder: false,
              parent: this.ctxNode || this.root,
              mode: 'create'
            })
            if (!this.ctxNode) {
              this.root.children!.unshift(addNote)
            } else {
              this.ctxNode.children!.unshift(addNote)
            }
            break
          case 'createFolder':
            const addFolder = createFileNode({
              fileName: nanoid(),
              folder: true,
              parent: this.ctxNode || this.root,
              mode: 'create'
            })
            if (!this.ctxNode) {
              this.root.children!.unshift(addFolder)
            } else {
              this.ctxNode.children!.unshift(addFolder)
            }
            break
          case 'rename':
            if (this.ctxNode) {
              this.ctxNode.mode = 'edit'
              this.ctxNode.editName = this.ctxNode.filename
            }
            break
          case 'openInNewTab':
            if (!this.currentTab.current && this.ctxNode) {
              this.currentTab.history.push(this.ctxNode)
              this.currentTab.index = this.currentTab.history.length - 1
            } else {
              this.appendTab(this.ctxNode)
            }
            break
          case 'delete':
            if (filePath && this.ctxNode) {
              this.removeSelf(this.ctxNode)
              MainApi.moveToTrash(filePath)
            }
            break
        }
      })
    })
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

  selectNote(node: IFileItem, scroll = true) {
    if (!this.schemaMap.get(node) && ['md', 'markdown'].includes(node.ext || '')) {
      try {
        const {schema, nodes} = markdownParser(node.filePath)
        this.schemaMap.set(node, {
          state: schema
        })
      } catch (e) {
        console.error('parser err', e)
      }
    }
    document.title = this.root ? `${basename(this.root.filePath)}-${basename(node.filePath)}` : basename(node.filePath)
    this.currentTab.history = this.currentTab.history.slice(0, this.currentTab.index + 1)
    this.currentTab.history.push(node)
    this.openParentDir(node.filePath)
    this.currentTab.index = this.currentTab.history.length - 1
    MainApi.setWin({openFile: node.filePath})
    if (scroll) {
      this.currentTab.store!.container?.scroll({
        top: 0
      })
    }
  }

  selectPath(filePath: string) {
    if (!stat(filePath)) return
    if (this.root && filePath.startsWith(this.root.filePath)) {
      let stack = this.root.children!.slice()
      while (stack.length) {
        const file = stack.shift()!
        if (file.filePath === filePath && !file.folder) {
          this.selectNote(file)
          return
        }
        if (file.folder && file.children?.length) {
          stack.push(...file.children)
        }
      }
    } else {
      this.openNewNote(filePath)
    }
    document.title = this.root ? `${basename(this.root.filePath)}-${basename(filePath)}` : basename(filePath)
  }
  createNewNote(filePath: string) {
    let node:IFileItem
    if (this.root && filePath.startsWith(this.root.filePath)) {
      const map = new Map(this.nodes.map(n => [n.filePath, n]))
      node = createFileNode({
        fileName: filePath,
        parent: map.get(join(filePath, '..')),
        folder: false
      })
    } else {
      node = createFileNode({
        fileName: filePath,
        filePath: filePath,
        folder: false
      })
    }
    if ((!this.root || !filePath.startsWith(this.root.filePath)) && mediaType(filePath) === 'markdown') {
      this.watcher.watchNote(filePath)
    }
    appendFileSync(filePath, '', {encoding: 'utf-8'})
    this.currentTab.history.push(node)
    this.currentTab.index = this.currentTab.history.length - 1
    MainApi.setWin({openFile: node.filePath})
  }

  openNewNote(filePath: string) {
    if (this.currentTab.current?.filePath === filePath) return
    if (this.root && filePath.startsWith(this.root.filePath)) {
      const node = this.files.find(n => !n.folder && n.filePath === filePath)
      if (node) {
        this.selectNote(node)
        if (node.ext === 'md') {
          appendRecentNote(filePath, treeStore.root.filePath)
        }
      }
    } else {
      const node = createFileNode({
        fileName: filePath,
        filePath: filePath,
        folder: false
      })
      const media = mediaType(filePath)
      if (media === 'markdown') {
        const {schema} = markdownParser(filePath)
        this.schemaMap.set(node, {
          state: schema
        })
      }
      if (media === 'markdown' && (!this.root || !filePath.startsWith(this.root.filePath))) {
        this.watcher.watchNote(filePath)
      }
      MainApi.setWin({openFile: node.filePath})
      this.currentTab.history.push(node)
      this.currentTab.index = this.currentTab.history.length - 1
    }
  }
  open(path: string, openFile?: string) {
    try {
      const stat = statSync(path)
      document.title = basename(path)
      if (stat.isDirectory()) {
        this.currentTab.index = 0
        this.currentTab.history = []
        document.title = basename(path)
        this.openFolder(path, openFile)
        appendRecentDir(path)
      } else {
        document.title = this.root ? `${basename(this.root.filePath)}-${basename(path)}` : basename(path)
        this.openNewNote(path)
        this.openParentDir(path)
      }
    } catch (e) {}
  }
  setState<T extends GetFields<TreeStore>>(value: { [P in T]: TreeStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }

  parserQueue(files: IFileItem[]) {
    if (!files.length) return
    const file = files.shift()!
    if (!this.schemaMap.get(file)) {
      this.schemaMap.set(file, {
        state: markdownParser(file.filePath).schema
      })
    }
    if (files.length) {
      requestIdleCallback(() => this.parserQueue(files))
    }
  }

  getSchema(file: IFileItem) {
    if (file?.ext !== 'md' && file?.ext !== 'markdown') return
    if (this.schemaMap.get(file)) return this.schemaMap.get(file)
    this.schemaMap.set(file, {
      state: markdownParser(file.filePath).schema
    })
    return this.schemaMap.get(file)
  }

  openParentDir(filePath: string) {
    const stack = this.root?.children?.slice() || []
    while (stack.length) {
      const item = stack.shift()!
      if (filePath.startsWith(item.filePath)) {
        if (item.folder) {
          item.expand = true
          if (filePath !== item.filePath) {
            stack.push(...item.children!)
          }
        }
      }
    }
  }
  openFolder(path: string, openFile?: string) {
    this.watcher.destroy()
    MainApi.setWin({openFolder: path})
    const {root, files} = parserNode(path)
    this.root = root
    this.watcher.watch()
    requestIdleCallback(() => this.parserQueue(files))
    if (openFile && existsSync(openFile)) {
      this.open(openFile)
      this.openParentDir(openFile)
    } else {
      let firstNote: IFileItem | null = null
      let stack = this.root.children?.slice() || []
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
      if (firstNote) {
        this.currentTab.history.push(firstNote)
      }
    }
    setTimeout(action(() => this.fold = false), 100)
    this.watcher.openDirCheck()
  }
  moveNode(to: IFileItem) {
    if (this.dragNode && this.dragNode !== to && to.children!.every(c => c !== this.dropNode)) {
      this.watcher.pause()
      const fromPath = this.dragNode.filePath
      const toPath = to.filePath!
      this.dropNode = null
      renameSync(fromPath, join(toPath, basename(fromPath)))
      this.removeSelf(this.dragNode)
      to.children!.push(this.dragNode)
      Object.defineProperty(this.dragNode, 'parent', {
        configurable: true,
        get() {
          return to
        }
      })
      to.children = sortFiles(to.children!)
      if (this.dragNode === this.currentTab.current) {
        MainApi.setWin({openFile: this.dragNode.filePath})
      }
    }
  }

  saveNote(file: IFileItem) {
    const parent = file.parent!
    this.watcher.pause()
    if (file.mode === 'create') {
      if (!file.editName) {
        parent.children = parent.children!.filter(c => c !== file)
      } else {
        let path = join(parent.filePath, file.editName)
        if (!file.folder && !path.endsWith('.md')) path += '.md'
        if (parent.children?.find(c => c.filePath === path) || existsSync(path)) return message$.next({
          type: 'warning',
          content: configStore.isZh ? '该文件已存在' : 'The file already exists'
        })
        if (file.folder) {
          mkdirSync(path)
        } else {
          appendFileSync(path, '')
        }
        file.ext = 'md'
        file.mode = undefined
        file.children = file.folder ? [] : undefined
        file.filename = file.editName.replace(/\.md$/, '')
        file.editName = undefined
      }
      parent.children = sortFiles(parent.children!)
    }
    if (file.mode === 'edit') {
      if (!file.editName || file.editName === file.filename) {
        file.editName = ''
        file.mode = undefined
      } else {
        const p = parse(file.editName)
        const path = file.filePath
        file.filename = file.folder ? file.editName : p.name
        let newPath = join(path, '..', file.filename)
        if (!file.folder && file.ext) newPath += `.${file.ext}`
        renameSync(path, newPath)
        file.mode = undefined
      }
    }
  }

  getAbsolutePath(file: IFileItem) {
    if (this.root) {
      return file.filePath.replace(this.root.filePath, '').split('/').slice(1)
    } else {
      return [file.filename]
    }
  }

  appendTab(file?: IFileItem | null) {
    const history: IFileItem[] = []
    if (file) history.push(file)
    const tab = observable({
      get current() {
        return this.history[this.index]
      },
      history,
      index: 0,
      id: nanoid(),
      get hasPrev() {
        return this.index > 0
      },
      store: null,
      get hasNext() {
        return this.index < this.history.length - 1
      }
    } as Tab)
    this.tabs.push(tab)
    this.currentIndex = this.tabs.length - 1
  }

  removeTab(i: number) {
    if (this.tabs.length < 2) return
    this.tabs.splice(i, 1)
    if (i === this.currentIndex) {
      if (!this.tabs[this.currentIndex]) {
        this.currentIndex--
      }
    } else if (i < this.currentIndex) {
      this.currentIndex--
    }
  }

  private removeSelf(node: IFileItem) {
    const index = this.currentTab.history.findIndex(n => n === node)
    if (index !== -1) {
      this.currentTab.history.splice(index, 1)
      if (index <= this.currentTab.index) this.currentTab.index--
    }
    node.parent!.children = node.parent!.children!.filter(c => c !== node)
  }
}

export const treeStore = new TreeStore()
