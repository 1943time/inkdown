import {action, makeAutoObservable, observable, runInAction} from 'mobx'
import {GetFields, IFileItem, Tab} from '../index'
import {createFileNode, defineParent, parserNode, sortFiles} from './parserNode'
import {nanoid} from 'nanoid'
import {basename, join, parse, sep} from 'path'
import {mkdirSync, appendFileSync, existsSync, renameSync, watch, statSync, readFileSync, readdirSync} from 'fs'
import {MainApi} from '../api/main'
import {markdownParser} from '../editor/parser'
import {MenuKey} from '../utils/keyboard'
import {message$, stat} from '../utils'
import {Watcher} from './watch'
import {Subject} from 'rxjs'
import {mediaType} from '../editor/utils/dom'
import {configStore} from './config'
import {appendRecentDir, appendRecentNote, db, moveFileRecord} from './db'
import {refactor, renameAllFiles} from './refactor'
import {saveDoc$} from '../editor/Editor'

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
  moveFile$ = new Subject<{
    from: string
    to: string
  }>()

  get files() {
    if (!this.root) return []
    let files: IFileItem[] = []
    const stack: IFileItem[] = this.root.children!.slice()
    while (stack.length) {
      const node = stack.shift()!
      files.push(node)
      if (node.folder) {
        stack.push(...node.children!)
      }
    }
    return files
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
        message$.next({type: 'success', content: 'Copied to clipboard'})
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
        switch (params.command) {
          case 'createNote':
            const addNote = createFileNode({
              folder: false,
              parent: this.ctxNode || this.root,
              mode: 'create',
              filePath: ''
            })
            if (!this.ctxNode) {
              this.root.children!.unshift(addNote)
            } else {
              this.ctxNode.children!.unshift(addNote)
            }
            break
          case 'createFolder':
            const addFolder = createFileNode({
              folder: true,
              parent: this.ctxNode || this.root,
              mode: 'create',
              filePath: ''
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
              db.history.where('filePath').equals(filePath).delete()
            }
            break
        }
      })
    })
  }

  getFileMap(root = false) {
    const nodes = this.files
    if (root) nodes.push(this.root)
    return new Map(nodes.map(n => [n.filePath, n]))
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
    if (node.ext === 'md' && this.root) appendRecentNote(node.filePath, this.root.filePath)
    document.title = this.root ? `${basename(this.root.filePath)}-${basename(node.filePath)}` : basename(node.filePath)
    this.currentTab.history = this.currentTab.history.slice(0, this.currentTab.index + 1)
    this.currentTab.history.push(node)
    this.openParentDir(node.filePath)
    this.currentTab.index = this.currentTab.history.length - 1
    MainApi.setWin({openFile: node.filePath})
    if (this.currentTab.store?.openSearch) this.currentTab.store?.setSearchText(this.currentTab.store.search.text)
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
    let node: IFileItem
    if (this.root && filePath.startsWith(this.root.filePath)) {
      const map = this.getFileMap(true)
      node = createFileNode({
        parent: map.get(join(filePath, '..')),
        folder: false,
        filePath: filePath
      })
    } else {
      node = createFileNode({
        filePath: filePath,
        folder: false
      })
    }
    if ((!this.root || !filePath.startsWith(this.root.filePath)) && mediaType(filePath) === 'markdown') {
      this.watcher.watchNote(filePath)
    }
    appendFileSync(filePath, '', {encoding: 'utf-8'})
    if (this.root && filePath.startsWith(this.root.filePath)) this.watcher.onChange('update', filePath, node)
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
    } catch (e) {
    }
  }

  setState<T extends GetFields<TreeStore>>(value: { [P in T]: TreeStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }

  parserQueue(files: IFileItem[], force = false) {
    if (!files.length) return
    const file = files.shift()!
    if (!this.schemaMap.get(file) || force) {
      this.schemaMap.set(file, {
        state: markdownParser(file.filePath).schema
      })
      if (file.filePath === this.openNote?.filePath) {
        saveDoc$.next(this.schemaMap.get(file)?.state || null)
      }
    }
    if (files.length) {
      requestIdleCallback(() => this.parserQueue(files, force))
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
      if (to.children?.some(c => {
        return c.filename === this.dragNode!.filename && String(c.ext) === String(this.dragNode!.ext)
      })) {
        message$.next({
          type: 'warning',
          content: 'filename already exists'
        })
        return
      }
      const fromPath = this.dragNode.filePath
      const toPath = to.filePath!
      this.dragNode.parent!.children = this.dragNode.parent!.children!.filter(c => c !== this.dragNode)
      this.dropNode = null
      const targetPath = join(toPath, basename(fromPath))
      renameSync(fromPath, targetPath)
      to.children!.push(this.dragNode)
      to.children = sortFiles(to.children!)
      if (this.dragNode === this.currentTab.current) {
        MainApi.setWin({openFile: this.dragNode.filePath})
      }
      this.moveFile$.next({
        from: fromPath,
        to: targetPath
      })
      this.dragNode.filePath = targetPath
      defineParent(this.dragNode, to)
      if (this.dragNode.ext === 'md') {
        moveFileRecord(fromPath, targetPath)
      }
      if (this.dragNode.folder) {
        renameAllFiles(this.dragNode.filePath, this.dragNode.children || [])
      }
      this.checkDepends(fromPath, targetPath)
    }
  }

  saveNote(file: IFileItem) {
    const parent = file.parent!
    if (file.mode === 'create') {
      if (!file.editName) {
        parent.children = parent.children!.filter(c => c !== file)
      } else {
        let path = join(parent.filePath, file.editName)
        if (!file.folder && !path.endsWith('.md')) path += '.md'
        if (parent.children?.find(c => c.filePath === path) || existsSync(path)) return message$.next({
          type: 'warning',
          content: 'The name already exists'
        })
        if (file.folder) {
          mkdirSync(path)
        } else {
          appendFileSync(path, '')
        }
        file.ext = 'md'
        file.mode = undefined
        file.children = file.folder ? [] : undefined
        file.filePath = path
        file.filename = parse(path).name
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
        file.filePath = newPath
        renameSync(path, newPath)
        if (file.folder) {
          renameAllFiles(file.filePath, file.children || [])
        }
        this.checkDepends(path, newPath)
        this.moveFile$.next({
          from: path,
          to: newPath
        })
        file.mode = undefined
        if (file.ext === 'md') moveFileRecord(path, newPath)
      }
    }
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
    if (!configStore.config.autoRebuild) return
    const stat = statSync(targetPath)
    if (stat.isDirectory()) {
      const changeFiles = this.refactorFolder(oldPath, targetPath)
      const files = await refactor(changeFiles, this.root?.children || [])
      this.parserQueue(files.slice(), true)
    } else {
      const files = await refactor([[oldPath, targetPath]], this.root?.children || [])
      this.parserQueue(files.slice(), true)
    }
  }

  getAbsolutePath(file: IFileItem) {
    if (this.root) {
      return file.filePath.replace(this.root.filePath, '').split(sep).slice(1)
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
    this.currentTab.history = this.currentTab.history.filter(h => h !== node)
    if (this.currentTab.history.length > 1 && this.currentTab.index > this.currentTab.history.length - 1) {
      this.currentTab.index = this.currentTab.history.length - 1
    } else if (!this.currentTab.history.length) {
      this.currentTab.index = 0
    }
    node.parent!.children = node.parent!.children!.filter(c => c !== node)
  }
}

export const treeStore = new TreeStore()
