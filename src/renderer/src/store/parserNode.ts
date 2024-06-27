import {IFileItem, ISpaceNode} from '../index'
import {existsSync, readdirSync, renameSync, statSync} from 'fs'
import {basename, extname, isAbsolute, join, parse, sep} from 'path'
import {observable, runInAction} from 'mobx'
import {db, IFile} from './db'
import {message$, nid} from '../utils'
import {openMdParserHandle, parserMdToSchema} from '../editor/parser/parser'
import {EditorUtils} from '../editor/utils/editorUtils'
import {mediaType} from '../editor/utils/dom'
import {openConfirmDialog$} from '../components/Dialog/ConfirmDialog'
import {TreeStore} from './tree'
import {readdir, stat} from 'fs/promises'
import {MainApi} from '../api/main'
import {configStore} from './config'

export const findAbsoluteLinks = (schema: any[], filePath: string, prePath: number[] = [], links: {path: number[], target: string}[] = []) => {
  for (let i = 0; i < schema.length; i++) {
    const n = schema[i]
    const curPath = [...prePath, i]
    if (n.url && !n.url.startsWith('http') && !n.url.startsWith('data:') && !n.url.startsWith('#')) {
      const path = isAbsolute(n.url) ? n.url : join(filePath, '..', n.url)
      links.push({path: curPath, target: path.replace(/#[^\n]+$/, '')})
    }
    if (n.children) {
      findAbsoluteLinks(n.children, filePath, curPath, links)
    }
  }
  return links
}

export const defineParent = (node: IFileItem, parent: IFileItem | ISpaceNode) => {
  Object.defineProperty(node, 'parent', {
    configurable: true,
    get() {
      return parent
    }
  })
}

export const moveFileToSpace = async (tree: TreeStore, filePath: string, parentNode?: IFileItem) => {
  const parent = parentNode || tree.root!
  const fileMap = new Map(Array.from(tree.nodeMap.values()).map(v => [v.filePath, v]))
  if (existsSync(filePath)) {
    const {parser, terminate} = openMdParserHandle()
    const appendFiles = async (files: string[], parent: IFileItem | ISpaceNode) => {
      for (let f of files) {
        const s = await stat(f)
        const folder = s.isDirectory()
        if (!fileMap.get(f)) {
          tree.watcher.ignorePath.add(f)
          const id = nid()
          const now = Date.now()
          const insertData:IFile = {
            cid: id,
            created: now,
            sort: folder ? 0 : parent.children!.length,
            updated: s.mtime.valueOf(),
            spaceId: tree.root!.cid,
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
          const node = createFileNode(insertData)
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
      tree.watcher.ignorePath.add(targetPath)
      renameSync(filePath, targetPath)
      await appendFiles([targetPath], parent)
    } finally {
      terminate()
    }
  }
}

export const insertFileNode = async (tree: TreeStore, data: Pick<IFile, 'filePath' | 'spaceId' | 'folder'>): Promise<IFileItem | null> => {
  const parentPath = join(data.filePath, '..')
  const fileMap = new Map<string, IFileItem>()
  for (const node of tree.nodeMap.values()) {
    fileMap.set(node.filePath, node)
  }
  if (fileMap.get(data.filePath)) return fileMap.get(data.filePath)!
  let parent: IFileItem | ISpaceNode | undefined = fileMap.get(parentPath)
  if (!parent) parent = tree.root?.filePath === parentPath ? tree.root :undefined
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
    const node = createFileNode(insertData, parent)
    runInAction(() => {
      if (s.isDirectory()) {
        parent!.children!.unshift(node)
      } else {
        parent!.children!.push(node)
      }
    })
    tree.nodeMap.set(node.cid, node)
    return node
  } catch (e) {
    console.error('external change', e)
    return null
  }
}

export const createFileNode = (file: IFile, parent?: IFileItem | ISpaceNode, ghost = false) => {
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
    defineParent(node, parent)
  }
  return observable(node, {
    schema: false,
    sel: false,
    history: false,
    sort: false,
    links: false
  })
}

export const sortFiles = <T extends IFileItem | IFile>(files: T[]):T[] => {
  return files.sort((a, b) => {
    return a.sort > b.sort ? 1 : -1
  })
}

export class ReadSpace {
  private fileMap = new Map<string, IFile>()
  private nodeMap = new Map<string, IFileItem>()
  private existSet = new Set<string>()
  private readonly spaceId!: string
  private newNote: IFile[] = []
  private spaceNode!: ISpaceNode
  constructor(spaceId: string) {
    this.spaceId = spaceId
  }
  private read(dir: string, ) {
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
    files = sortFiles(files)
    const tree: IFileItem[] = []
    for (let f of files) {
      const node = createFileNode(f, parent || this.spaceNode)
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
        message$.next({
          type: 'error',
          content: 'Parsing failed'
        })
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
  async getTree():Promise<{space: ISpaceNode, nodeMap: Map<string, IFileItem>} | null> {
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
          return this.getTree()
        }
        throw new Error(configStore.zh ? '该目录与空间目录不一致，请重新选择。' : 'This directory is inconsistent with the space directory, please select again.')
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
}
