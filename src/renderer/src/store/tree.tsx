import {action, makeAutoObservable, observable, runInAction} from 'mobx'
import {GetFields, IFileItem, Tab} from '../index'
import {createFileNode, defineParent, parserNode, sortFiles} from './parserNode'
import {nanoid} from 'nanoid'
import {basename, join, parse, sep} from 'path'
import {appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync} from 'fs'
import {MainApi} from '../api/main'
import {MenuKey} from '../utils/keyboard'
import {isMac, message$, stat} from '../utils'
import {Watcher} from './watch'
import {Subject} from 'rxjs'
import {mediaType} from '../editor/utils/dom'
import {configStore} from './config'
import {appendRecentDir, appendRecentNote, db, removeFileRecord} from './db'
import {refactor, renameAllFiles} from './refactor'
import {EditorStore} from '../editor/store'
import {parserMdToSchema} from '../editor/parser/parser'
import {shareStore} from '../server/store'
import isHotkey from 'is-hotkey'
import {EditorUtils} from '../editor/utils/editorUtils'
import {cpSync} from 'fs'
import {openConfirmDialog$} from '../components/ConfirmDialog'
import {Checkbox} from 'antd'

export class TreeStore {
  treeTab: 'folder' | 'search' = 'folder'
  root!: IFileItem
  copyItem: IFileItem | null = null
  ctxNode: IFileItem | null = null
  dragNode: IFileItem | null = null
  dropNode: IFileItem | null = null
  tabs: Tab[] = []
  selectItem: IFileItem | null = null
  searchKeyWord = ''
  currentIndex = 0
  width = 260
  tabContextIndex = 0
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
    if (!this.root) return []
    let files: IFileItem[] = [this.root]
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

  get openedNote() {
    return this.tabs[this.currentIndex].current
  }

  get firstNote() {
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
    window.addEventListener('keydown', e => {
      if (this.selectItem && !this.selectItem.root && isHotkey('enter', e)) {
        const item = this.selectItem
        runInAction(() => {
          item.mode = 'edit'
          item.editName = item.filename
          this.selectItem = null
        })
      }
      if (this.selectItem && isHotkey('mod+backspace', e)) {
        this.moveToTrash(this.selectItem)
      }
      if (isHotkey('mod+c', e)) {
        if (this.selectItem) {
          this.copyItem = this.selectItem
        } else {
          this.copyItem = null
        }
      }
      if (isHotkey('mod+v', e) && this.copyItem) {
        const copyItem = this.copyItem
        if (this.selectItem) {
          const folder = this.selectItem.folder ? this.selectItem : this.selectItem.parent
          if (folder && folder.filePath !== copyItem.parent?.filePath) {
            const targetPath = join(folder.filePath, this.copyItem.filename + `${this.copyItem.ext ? '.' + this.copyItem.ext : ''}`)
            if (folder.children?.some(c => c.filename === copyItem.filename && (!!c.folder === !!copyItem.folder))) {
              openConfirmDialog$.next({
                title: configStore.zh ? `该${copyItem.folder ? '文件夹' : '文件'}已存在，是否覆盖？` : `The ${copyItem.folder ? 'folder' : 'file'} already exists, do you want to overwrite it?`,
                onConfirm: () => {
                  this.pasteFile(copyItem.filePath, targetPath, copyItem.folder)
                  try {
                    const map = this.getFileMap()
                    if (!copyItem.folder && copyItem.ext === 'md') {
                      const node = map.get(targetPath)
                      if (node) {
                        this.getSchema(node, true)
                      }
                    } else if (copyItem.folder) {
                      const stack = map.get(targetPath)?.children?.slice() || []
                      while (stack.length) {
                        const item = stack.pop()!
                        if (item.folder) {
                          stack.push(...item.children || [])
                        } else if (item.ext === 'md') {
                          this.getSchema(item, true)
                        }
                      }
                    }
                  } catch (e) {
                    console.error('paste file', e)
                  } finally {
                    this.copyItem = null
                  }
                }
              })
            } else {
              this.pasteFile(copyItem.filePath, targetPath, copyItem.folder)
              this.copyItem = null
            }
          }
        } else {
          this.copyItem = null
        }
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
        s.isDirectory() ? this.openFolder(path) : this.openNote(path)
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
  private pasteFile(from: string, to: string, folder = false) {
    cpSync(from, to, {force: true, recursive: folder})
    this.watcher.onChange('update', to)
  }
  command(params: {
    type?: 'rootFolder' | 'file' | 'folder'
    filePath: string
    command: 'createNote' | 'createFolder' | 'delete' | 'rename' | 'openInNewTab' | 'shareFolder' | 'newCopy'
  }) {
    const {filePath} = params
    switch (params.command) {
      case 'createNote':
        let addNote = createFileNode({
          folder: false,
          editName: 'untitled',
          parent: this.ctxNode || this.root,
          mode: 'create',
          filePath: ''
        })
        if (!this.ctxNode) {
          this.root.children!.unshift(addNote)
        } else {
          this.ctxNode.children!.unshift(addNote)
        }
        addNote.parent!.expand = true
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
        if (this.ctxNode?.filePath) this.appendTab(this.ctxNode.filePath)
        break
      case 'newCopy':
        if (this.ctxNode && !this.ctxNode.folder) {
          let addNote = createFileNode({
            folder: false,
            editName: `${this.ctxNode.filename}_copy`,
            parent: this.ctxNode.parent,
            mode: 'copy',
            copyItem: this.ctxNode,
            filePath: ''
          })
          this.ctxNode.parent?.children!.unshift(addNote)
          addNote.parent!.expand = true
        }
        break
      case 'shareFolder':
        if (this.ctxNode?.filePath || params.type === 'rootFolder') {
          this.shareFolder$.next(params.type === 'rootFolder' ? treeStore.root?.filePath : this.ctxNode?.filePath!)
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
    if (item && !item.root) {
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
  }

  getFileMap(root = false) {
    if (!this.root) return new Map()
    const nodes = this.nodes
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

  async restoreTabs(tabs: string[]) {
    const nodeMap = new Map(this.nodes.map(n => [n.filePath, n]))
    let first = true
    for (let t of tabs) {
      const tab = this.createTab()
      if (nodeMap.get(t)) {
        tab.history.push(nodeMap.get(t)!)
      } else {
        const st = stat(t)
        if (st && !st.isDirectory()) {
          const node = this.createSingleNode(t)
          tab.history.push(node)
        }
      }
      first ? this.tabs[0] = tab : this.tabs.push(tab)
      first = false
    }
    if (this.currentTab.current?.filePath) this.openParentDir(this.currentTab.current)
  }

  setState<T extends GetFields<TreeStore>>(value: { [P in T]: TreeStore[P] }) {
    for (let key of Object.keys(value)) {
      this[key] = value[key]
    }
  }

  async getSchema(file: IFileItem, force = false) {
    if (file?.ext !== 'md' && file?.ext !== 'markdown') return
    if (file.schema && !force) return file
    const [schema] = await parserMdToSchema([readFileSync(file.filePath, {encoding: 'utf-8'})])
    file.schema = schema?.length ? schema : [EditorUtils.p]
    if (force && file === this.openedNote) {
      this.externalChange$.next(file.filePath)
    }
    return file
  }

  openParentDir(item: IFileItem) {
    while (item.parent) {
      item.parent.expand = true
      item = item.parent
    }
  }

  createSingleNode(filePath: string) {
    const node = createFileNode({
      filePath: filePath,
      folder: false
    })
    const media = mediaType(filePath)
    if (media === 'markdown' && (!this.root || !filePath.startsWith(this.root.filePath))) {
      this.watcher.watchNote(filePath)
    }
    return node
  }

  openNote(file: string | IFileItem, scroll = true) {
    const filePath = typeof file === 'string' ? file : file.filePath
    if (this.currentTab.current?.filePath === filePath) return
    this.checkOtherTabsShouldUpdate()
    if (this.root && filePath.startsWith(this.root.filePath)) {
      let item = typeof file === 'string' ? undefined : file
      if (!item) {
        const nodeMap = new Map(this.nodes.map(n => [n.filePath, n]))
        item = nodeMap.get(filePath)
        if (!item) {
          if (!existsSync(filePath)) appendFileSync(filePath, '', {encoding: 'utf-8'})
          const parent = nodeMap.get(join(filePath, '..'))
          item = createFileNode({
            filePath: filePath,
            folder: false,
            parent: parent
          })
          if (parent) parent.children = sortFiles([...parent.children!, item])
        }
      }
      if (item.ext === 'md' && this.root) appendRecentNote(item.filePath, this.root.filePath)
      this.currentTab.history = this.currentTab.history.slice(0, this.currentTab.index + 1)
      this.currentTab.history.push(item)
      this.openParentDir(item)
      this.currentTab.index = this.currentTab.history.length - 1
      if (this.currentTab.store?.openSearch) this.currentTab.store.setSearchText(this.currentTab.store.search.text)
      if (scroll) {
        this.currentTab.store!.container?.scroll({
          top: 0
        })
      }
    } else {
      const index = this.currentTab.history.findIndex(f => f.filePath === filePath)
      if (index !== -1) {
        this.currentTab.index = index
      } else {
        if (!existsSync(filePath)) {
          appendFileSync(filePath, '', {encoding: 'utf-8'})
        }
        const node = this.createSingleNode(filePath)
        this.currentTab.history.push(node)
        this.currentTab.index = this.currentTab.history.length - 1
      }
    }
    this.recordTabs()
  }

  openFolder(dirPath: string) {
    this.watcher.destroy()
    MainApi.setWin({openFolder: dirPath})
    const {root} = parserNode(dirPath)
    this.root = root
    const pathMap = new Map(this.nodes.map(f => [f.filePath, f]))
    for (let t of this.tabs) {
      for (let f of t.history) {
        if (f.filePath.startsWith(this.root.filePath)) {
          const parentPath = join(f.filePath, '..')
          if (pathMap.get(parentPath)) {
            defineParent(f, pathMap.get(parentPath)!)
          }
        }
      }
    }
    appendRecentDir(dirPath)
    setTimeout(action(() => this.fold = false), 100)
    this.watcher.openDirCheck()
    this.parseFolder()
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
    const queue: IFileItem[] = []
    const stack: IFileItem[] = this.root.children!.slice()
    while (stack.length) {
      const item = stack.shift()!
      if (item.folder) {
        stack.unshift(...item.children?.slice() || [])
      } else if (['md', 'markdown'].includes(item.ext!)) {
        queue.push(item)
      }
    }
    const files: string[] = []
    for (let f of queue) {
      files.push(await window.api.fs.readFile(f.filePath, {encoding: 'utf-8'}))
    }
    const schemas = await parserMdToSchema(files)
    queue.map((f, i) => {
      if (!f.schema) f.schema = schemas[i]
    })
  }

  recordTabs() {
    MainApi.setWin({
      openTabs: this.tabs.filter(t => !!t.current).map(t => t.current!.filePath),
      index: this.currentIndex
    })
  }

  moveNode(to: IFileItem) {
    if (this.dragNode && this.dragNode !== to && to.children!.every(c => c !== this.dropNode)) {
      if (to.children?.some(c => {
        return c.filename === this.dragNode!.filename && String(c.ext) === String(this.dragNode!.ext)
      })) {
        message$.next({
          type: 'warning',
          content: configStore.zh ? '文件名已存在' : 'filename already exists'
        })
        return
      }
      const fromPath = this.dragNode.filePath
      const toPath = to.filePath!
      const dragNode = this.dragNode
      this.dragNode.parent!.children = this.dragNode.parent!.children!.filter(c => c !== this.dragNode)
      this.dropNode = null
      const targetPath = join(toPath, basename(fromPath))
      renameSync(fromPath, targetPath)
      // Synchronize remote mapping
      if (dragNode.folder || dragNode.ext === 'md') shareStore.renameFilePath(fromPath, targetPath)
      to.children!.push(this.dragNode)
      to.children = sortFiles(to.children!)

      this.moveFile$.next({
        from: fromPath,
        to: targetPath
      })

      this.dragNode.filePath = targetPath
      defineParent(this.dragNode, to)
      if (this.dragNode.ext === 'md') {
        removeFileRecord(fromPath, targetPath)
      }
      if (this.dragNode.folder) {
        renameAllFiles(this.dragNode.filePath, this.dragNode.children || [])
      }
      this.checkDepends(fromPath, targetPath)

      if (this.dragNode === this.currentTab.current) {
        this.recordTabs()
      }
    }
  }

  saveNote(file: IFileItem) {
    const parent = file.parent!
    if (file.mode === 'create' || file.mode === 'copy') {
      if (!file.editName) {
        parent.children = parent.children!.filter(c => c !== file)
      } else {
        let path = join(parent.filePath, file.editName)
        if (!file.folder && !path.endsWith('.md')) path += '.md'
        if (parent.children?.find(c => c.filePath === path) || existsSync(path)) return message$.next({
          type: 'warning',
          content: configStore.zh ? '文件名已存在' : 'The name already exists'
        })
        if (file.folder) {
          mkdirSync(path)
        } else {
          if (file.mode === 'copy') {
            appendFileSync(path, readFileSync(file.copyItem!.filePath, {encoding: 'utf-8'}), {encoding: 'utf-8'})
            file.schema = file.copyItem?.schema || [EditorUtils.p]
          } else {
            appendFileSync(path, '', {encoding: 'utf-8'})
          }
        }
        file.ext = 'md'
        file.mode = undefined
        file.children = file.folder ? [] : undefined
        file.filePath = path
        file.filename = file.editName
        file.editName = undefined
        file.copyItem = undefined
        if (!file.folder) this.openNote(file)
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
        if (file.ext === 'md') removeFileRecord(path, newPath)
        if (file.ext === 'md' || file.folder) shareStore.renameFilePath(path, newPath)
      }
    }
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
    if (!configStore.config.autoRebuild) return
    const stat = statSync(targetPath)
    let updateFiles: IFileItem[] = []
    if (stat.isDirectory()) {
      const changeFiles = this.refactorFolder(oldPath, targetPath)
      updateFiles = await refactor(changeFiles, this.root?.children || [])
    } else {
      updateFiles = await refactor([[oldPath, targetPath]], this.root?.children || [])
    }
    const filesStr: string[] = []
    for (let f of updateFiles) {
      filesStr.push(await window.api.fs.readFile(f.filePath, {encoding: 'utf-8'}))
    }
    const schemas = await parserMdToSchema(filesStr)
    updateFiles.map((f, i) => {
      f.schema = schemas[i]
      this.externalChange$.next(f.filePath)
    })
  }

  getAbsolutePath(file: IFileItem) {
    if (this.root) {
      return file.filePath.replace(this.root.filePath, '').split(sep).slice(1)
    } else {
      return [file.filename]
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

  appendTab(file?: string | IFileItem) {
    const index = this.tabs.findIndex(t => {
      if (typeof file === 'string') return t.current?.filePath === file
      if (typeof file === 'object') return t.current === file
      return false
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
      t.history = t.history.filter(h => h !== node)
      if (t.history.length > 0 && t.index > t.history.length - 1) {
        t.index = t.history.length - 1
      } else if (!t.history.length) {
        t.index = 0
      }
    }
    node.parent!.children = node.parent!.children!.filter(c => c !== node)
    if (!this.openedNote || this.openedNote.ext !== '.md') {
      this.currentTab.store.editor.selection = null
    }
  }
}

export const treeStore = new TreeStore()
