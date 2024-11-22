import { basename, extname, isAbsolute, join, parse, sep } from 'path'
import { IFileItem, ISpaceNode } from '../types'
import { Core, useCoreContext } from './core'
import { db, IFile } from './db'
import { observable, runInAction } from 'mobx'
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from 'fs'
import { openMdParserHandle, parserMdToSchema } from '../editor/parser/parser'
import { nid } from '../utils'
import { mediaType } from '../editor/utils/dom'
import { readdir, stat, writeFile } from 'fs/promises'
import { openConfirmDialog$ } from '../components/Dialog/ConfirmDialog'
import { MainApi } from '../api/main'
import { EditorUtils } from '../editor/utils/editorUtils'
import { toMarkdown } from '../editor/utils/toMarkdown'

export class NodeStore {
  private fileMap = new Map<string, IFile>()
  private nodeMap = new Map<string, IFileItem>()
  private existSet = new Set<string>()
  private spaceId: string = ''
  private newNote: IFile[] = []
  private spaceNode!: ISpaceNode
  constructor(
    private readonly core: Core
  ) {}

  private read(dir: string) {
    let fileList = readdirSync(dir).map(f => {
      const path = join(dir, f)
      const s = statSync(path)
      return {path: join(dir, f), update: s.mtime.valueOf(), folder: s.isDirectory(), name: basename(path)}
    }).sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1
      else return a.name > b.name ? 1 : -1
    })
    let tree: IFile[] = []
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]
      const filePath = f.path
      this.existSet.add(filePath)
      const s = statSync(filePath)
      if (s.isDirectory() && f.path.toLowerCase() === 'node_modules') {
        continue
      }
      const mtime = s.mtime.valueOf()
      if (!this.fileMap.get(filePath)) {
        const cid = nid()
        if (s.isDirectory()) {
          const addData: IFile = {
            cid,
            spaceId: this.spaceId,
            filePath,
            created: Date.now(),
            synced: 0,
            folder: true,
            sort: 0
          }
          db.file.add(addData)
          this.fileMap.set(filePath, addData)
          addData.children = this.read(filePath)
          tree.push(addData)
        } else {
          const addData: IFile = {
            cid,
            updated: mtime,
            spaceId: this.spaceId,
            filePath,
            created: Date.now(),
            synced: 0,
            folder: false,
            sort: i
          }
          db.file.add(addData)
          this.fileMap.set(filePath, addData)
          if (mediaType(f.name) === 'markdown') {
            this.newNote.push(addData)
          }
          tree.push(addData)
        }
      } else {
        const fd = this.fileMap.get(filePath)!
        if (s.isDirectory()) {
          fd.children = this.read(filePath)
        } else {
          if (fd.updated !== s.mtime.valueOf() && mediaType(f.name) === 'markdown') {
            this.newNote.push(fd)
            db.file.update(fd.cid,  {updated: mtime})
          }
        }
        tree.push(fd)
      }
    }
    return tree
  }

  private toNodeTree(files: IFile[], parent?: IFileItem) {
    files = this.sortFiles(files)
    const tree: IFileItem[] = []
    for (let f of files) {
      const node = this.createFileNode(f, parent || this.spaceNode)
      if (node.folder) {
        node.children = this.toNodeTree(f.children || [], node)
      }
      this.nodeMap.set(node.cid, node)
      tree.push(node)
    }
    return observable(tree)
  }
  private async parser(files: IFile[]) {
    if (this.newNote.length) {
      const {parser, terminate} = openMdParserHandle()
      try {
        for (let i = 0 ; i <= this.newNote.length; i += 30) {
          const stack = this.newNote.slice(i, i + 30)
          const schemas = await parser(stack.map(s => {
            return {filePath: s.filePath}
          }))
          stack.map((s, i) => {
            try {
              const res = schemas[i]
              db.file.update(s.cid, {schema: res.schema, links: res.links})
              s.schema = res.schema
              s.links = res.links
            } catch (e) {
              stack[i].schema = EditorUtils.p
            }
          })
        }
      } catch (e) {
        console.error(e)
        this.core.message.error('Parsing failed')
      } finally {
        terminate()
      }
    }
    for (let f of this.fileMap.values()) {
      if (!this.existSet.has(f.filePath)) {
        db.file.delete(f.cid)
      }
    }
    // console.log('new', this.newNote.length)
    const nodeTree = this.toNodeTree(files)
    runInAction(() => this.spaceNode.children = nodeTree)
    return {space: this.spaceNode, nodeMap: this.nodeMap}
  }
  async getTree(spaceId: string):Promise<{space: ISpaceNode, nodeMap: Map<string, IFileItem>} | null> {
    this.spaceId = spaceId
    const space = await db.space.get(this.spaceId)
    if (!space) return null
    try {
      readdirSync(space.filePath)
    } catch (e) {
      return MainApi.openDialog({
        defaultPath: space.filePath,
        properties: ['openDirectory', 'createDirectory']
      }).then(res => {
        if (res.filePaths[0] === space.filePath) {
          return this.getTree(this.spaceId)
        }
        throw new Error(this.core.config.zh ? '该目录与空间目录不一致，请重新选择。' : 'This directory is inconsistent with the space directory, please select again.')
      })
    }
    this.spaceNode = observable({
      cid: space.cid,
      root: true,
      filePath: space.filePath,
      name: space.name,
      imageFolder: space.imageFolder,
      relative: space.relative,
      background: space.background
    } as ISpaceNode)
    const docs = await db.file.where('spaceId').equals(space.cid).toArray()
    this.fileMap = new Map(docs.map(d => [d.filePath, d]))
    const filesTree = this.read(space.filePath)
    if (!docs.length && this.fileMap.size > 5000) {
      return new Promise((resolve, reject) => {
        openConfirmDialog$.next({
          title: 'Folder has too many contents',
          description: 'This folder contains a large number of files, which may affect the application speed. Do you want to still open it?',
          okText: 'Open',
          cancelText: 'Delete Space',
          onConfirm: async () => {
            resolve(await this.parser(filesTree))
          },
          onClose: () => {
            db.space.delete(this.spaceId)
            resolve(null)
          }
        })
      })
    } else {
      return this.parser(filesTree)
    }
  }

  findAbsoluteLinks(schema: any[], filePath: string, prePath: number[] = [], links: {path: number[], target: string}[] = []) {
    for (let i = 0; i < schema.length; i++) {
      const n = schema[i]
      const curPath = [...prePath, i]
      if (n.url && !n.url.startsWith('http') && !n.url.startsWith('data:') && !n.url.startsWith('#')) {
        const path = isAbsolute(n.url) ? n.url : join(filePath, '..', n.url)
        links.push({path: curPath, target: path.replace(/#[^\n]+$/, '')})
      }
      if (n.children) {
        this.findAbsoluteLinks(n.children, filePath, curPath, links)
      }
    }
    return links
  }

  sortFiles = <T extends IFileItem | IFile>(files: T[]):T[] => {
    return files.sort((a, b) => {
      if (a.sort === b.sort) {
        return 0
      }
      return a.sort > b.sort ? 1 : -1
    })
  }

  defineParent(node: IFileItem, parent: IFileItem | ISpaceNode) {
    Object.defineProperty(node, 'parent', {
      configurable: true,
      get() {
        return parent
      }
    })
  }

  createFileNode(file: IFile, parent?: IFileItem | ISpaceNode, ghost = false) {
    const name = file.folder ? file.filePath.split(sep).pop() : parse(file.filePath).name
    const node = {
      cid: file.cid,
      filename: name,
      folder: file.folder,
      sort: file.sort,
      children: file.folder ? [] : undefined,
      filePath: file.filePath,
      schema: file.schema,
      ghost,
      history: undefined,
      sel: undefined,
      hidden: name?.startsWith('.'),
      lastOpenTime: file.lastOpenTime,
      spaceId: file.spaceId,
      links: file.links,
      ext: file.folder ? undefined : extname(file.filePath).replace(/^\./, ''),
    } as IFileItem
    if (parent) {
      this.defineParent(node, parent)
    }
    return observable(node, {
      schema: false,
      sel: false,
      history: false,
      sort: false,
      links: false
    })
  }

  async insertFileNode(data: Pick<IFile, 'filePath' | 'spaceId' | 'folder'>): Promise<IFileItem | null> {
    const parentPath = join(data.filePath, '..')
    const fileMap = new Map<string, IFileItem>()
    for (const node of this.core.tree.nodeMap.values()) {
      fileMap.set(node.filePath, node)
    }
    if (fileMap.get(data.filePath)) return fileMap.get(data.filePath)!
    let parent: IFileItem | ISpaceNode | undefined = fileMap.get(parentPath)
    if (!parent) parent = this.core.tree.root?.filePath === parentPath ? this.core.tree.root :undefined
    if (!parent) return null
    try {
      const id = nid()
      const now = Date.now()
      const s = statSync(data.filePath)
      const insertData:IFile = {
        cid: id,
        created: now,
        sort: s.isDirectory() ? 0 : parent.children!.length,
        updated: s.mtime.valueOf(),
        ...data
      }
      if (mediaType(data.filePath) === 'markdown') {
        const [res] = await parserMdToSchema([{filePath: data.filePath}])
        insertData.schema = res.schema
        insertData.links = res.links
      }
      await db.file.add(insertData)
      const node = this.createFileNode(insertData, parent)
      runInAction(() => {
        if (s.isDirectory()) {
          parent!.children!.unshift(node)
        } else {
          parent!.children!.push(node)
        }
      })
      this.core.tree.nodeMap.set(node.cid, node)
      return node
    } catch (e) {
      console.error('external change', e)
      return null
    }
  }

  async moveFileToSpace(filePath: string, parentNode?: IFileItem, copy = false) {
    const parent = parentNode || this.core.tree.root!
    const fileMap = new Map(Array.from(this.core.tree.nodeMap.values()).map(v => [v.filePath, v]))
    if (existsSync(filePath)) {
      const {parser, terminate} = openMdParserHandle()
      const appendFiles = async (files: string[], parent: IFileItem | ISpaceNode) => {
        for (let f of files) {
          const s = await statSync(f)
          const folder = s.isDirectory()
          if (!fileMap.get(f)) {
            this.core.tree.watcher.ignorePath.add(f)
            const id = nid()
            const now = Date.now()
            const insertData:IFile = {
              cid: id,
              created: now,
              sort: folder ? 0 : parent.children!.length,
              updated: s.mtime.valueOf(),
              spaceId: this.core.tree.root!.cid,
              filePath: f,
              folder,
              synced: 0
            }
            if (mediaType(f) === 'markdown') {
              const [res] = await parser([{filePath: f}])
              insertData.schema = res.schema
              insertData.links = res.links
            }
            await db.file.add(insertData)
            const node = this.createFileNode(insertData, parent)
            runInAction(() => {
              folder ? parent.children!.unshift(node) : parent.children!.push(node)
            })
            if (folder) {
              const children = (await readdir(f)).map(s => join(f, s))
              await appendFiles(children, node)
            }
          }
        }
      }
      try {
        const targetPath = join(parent.filePath, basename(filePath))
        if (!existsSync(targetPath)) {
          this.core.tree.watcher.ignorePath.add(targetPath)
          if (copy) {
            cpSync(filePath, targetPath, {recursive: true})
          } else {
            renameSync(filePath, targetPath)
          }
          await appendFiles([targetPath], parent)
        }
      } finally {
        terminate()
      }
    }
  }

  async updateNode(node: IFileItem) {
    if (node.filePath && node.ext === 'md') {
      const md = toMarkdown(node.schema || [])
      try {
        await writeFile(node.filePath, md, {encoding: 'utf-8'})
        const links = this.findAbsoluteLinks(node.schema!, node.filePath)
        const s = await stat(node.filePath)
        await db.file.update(node.cid, {
          filePath: node.filePath,
          updated: s.mtime.valueOf(),
          schema: node.schema,
          links
        })
        node.links = links
        db.saveRecord(node)
      } catch (e: any) {
        if (e?.message) {
          this.core.message.error(e.message)
        }
        console.error('save fail', e)
      }
    }
  }

  renameFiles(nodes: IFileItem[], dir: string, changeFiles: {from: string, to: string}[] = []) {
    for (let n of nodes) {
      const path = join(dir, basename(n.filePath))
      db.file.update(n.cid, {
        filePath: path
      })
      runInAction(() => {
        n.filePath = path
      })
      if (n.folder && n.children?.length) {
        this.renameFiles(n.children, path, changeFiles)
      }
    }
    return changeFiles
  }
  async createDoc({parent, newName, copyItem, ghost}: {
    parent?: IFileItem | ISpaceNode, newName?: string, copyItem?: IFileItem, ghost?: boolean
  }) {
    newName = newName || 'Untitled'
    const name = this.getCreateName(parent, newName)
    const id = nid()
    const now = Date.now()
    let target = parent ? join(parent.filePath, name + '.md') : newName + '.md'
    const md = toMarkdown(copyItem?.schema || [EditorUtils.p])
    let updated = 0
    if (target && !ghost) {
      writeFileSync(target, md , {encoding: 'utf-8'})
      const s = statSync(target)
      updated = s.mtime.valueOf()
    }
    const data:IFile = {
      cid: id,
      filePath: target,
      created: now,
      folder: false,
      updated: updated,
      schema: JSON.parse(JSON.stringify(copyItem?.schema || [EditorUtils.p])),
      sort: 0,
      lastOpenTime: now,
      spaceId: parent ? parent.root ? parent.cid : parent.spaceId : undefined
    }
    if (!ghost) {
      await db.file.add(data)
    }
    const newNode = this.createFileNode(data, parent, ghost)
    if (parent) {
      const index = copyItem ? parent!.children!.findIndex(n => n === copyItem) : parent.children!.length - 1
      runInAction(() => {
        parent!.children!.splice(index + 1, 0, newNode)
      })
      parent.children!.map((n, i) => {
        db.file.update(n.cid, {sort: i})
        n.sort = i
      })
      this.core.tree.nodeMap.set(data.cid, newNode)
    }
    if (this.core.tree.selectItem) {
      runInAction(() => this.core.tree.selectItem = null)
    }
    this.core.tree.openNote(newNode)
    setTimeout(() => {
      setTimeout(() => {
        const title =
          this.core.tree.currentTab.store.container?.querySelector<HTMLInputElement>('.page-title')
        if (title) {
          title.focus()
          const range = document.createRange()
          range.selectNodeContents(title)
          range.collapse(false)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      }, 30)
    }, 30)
  }

  getCreateName(parent?: IFileItem | ISpaceNode, name = 'Untitled') {
    if (!parent) return name
    const start = name.match(/\s(\d+)$/)
    let index = start ? +start[1] : 0
    let cur = name
    const stack = parent.children || []
    while (stack.some(s => s.filename === cur)) {
      index++
      cur = name + ' ' + index
    }
    return cur
  }

 async deepCreateDoc(filePath: string) {
    const core = useCoreContext()
    if (!core.tree.root) {
      return
    }
    const parent = join(filePath, '..')
    const nodeMap = new Map(core.tree.nodes.map(n => [n.filePath, n]))
    let parentNode: ISpaceNode | IFileItem = nodeMap.get(parent) || core.tree.root
    if (!existsSync(parent)) {
      mkdirSync(parent, {recursive: true})
      const stack = parent.replace(core.tree.root.filePath + sep, '').split(sep)
      let curPaths: string[] = []
      for (const item of stack) {
        curPaths.push(item)
        const path = join(core.tree.root.filePath, curPaths.join(sep))
        if (nodeMap.get(path)) {
          parentNode = nodeMap.get(path)!
        } else {
          const id = nid()
          const now = Date.now()
          const data: IFile = {
            cid: id,
            filePath: path,
            spaceId: core.tree.root!.cid,
            updated: now,
            sort: 0,
            folder: true,
            created: now
          }
          await db.file.add(data)
          runInAction(() => {
            const node = this.createFileNode(data, parentNode)
            parentNode.children!.unshift(node)
            parentNode = node
          })
        }
      }
    }
    this.createDoc({parent: parentNode, newName: parse(filePath).name})
  }
}
