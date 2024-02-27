import {IFileItem, ISpaceNode} from '../index'
import {readdirSync, readFileSync, statSync} from 'fs'
import {basename, extname, join, parse, sep} from 'path'
import {observable, runInAction} from 'mobx'
import {db, IFile} from './db'
import {nid} from '../utils'
import {parserMdToSchema} from '../editor/parser/parser'
import {EditorUtils} from '../editor/utils/editorUtils'
import {mediaType} from '../editor/utils/dom'

export const defineParent = (node: IFileItem, parent: IFileItem | ISpaceNode) => {
  Object.defineProperty(node, 'parent', {
    configurable: true,
    get() {
      return parent
    }
  })
}

export const createFileNode = (file: IFile, parent?: IFileItem | ISpaceNode) => {
  const name = file.folder ? file.filePath.split(sep).pop() : parse(file.filePath).name
  const node = {
    cid: file.cid,
    filename: basename(file.filePath),
    folder: file.folder,
    sort: file.sort,
    children: file.folder ? [] : undefined,
    filePath: file.filePath,
    schema: file.schema,
    history: undefined,
    sel: undefined,
    hidden: name?.startsWith('.'),
    ext: file.folder ? undefined : extname(file.filePath).replace(/^\./, ''),
  } as IFileItem
  if (parent) {
    defineParent(node, parent)
  }
  return observable(node, {
    schema: false,
    sel: false,
    history: false
  })
}

export const sortFiles = <T extends IFileItem | IFile>(files: T[]):T[] => {
  return files.sort((a, b) => {
    if (a.folder !== b.folder) return a.folder ? -1 : 1
    return a.sort > b.sort ? 1 : -1
  })
}

class ReadSpace {
  private fileMap = new Map<string, IFile>()
  private existSet = new Set<string>()
  private readonly spaceId!: string
  private newNote: IFile[] = []
  private spaceNode!: ISpaceNode
  constructor(spaceId: string) {
    this.spaceId = spaceId
  }
  private read(dir: string, ) {
    const fileList = readdirSync(dir)
    let tree: IFile[] = []
    for (let f of fileList) {
      const filePath = join(dir, f)
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
          addData.children = this.read(dir)
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
            sort: 0
          }
          db.file.add(addData)
          this.fileMap.set(filePath, addData)
          if (mediaType(f) === 'markdown') {
            this.newNote.push(addData)
          }
          tree.push(addData)
        }
      } else {
        const fd = this.fileMap.get(filePath)!
        if (s.isDirectory()) {
          fd.children = this.read(filePath)
        } else {
          if (fd.updated !== s.mtime.valueOf() && mediaType(f) === 'markdown') {
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
      tree.push(node)
    }
    return observable(tree)
  }
  parseFolder() {}
  async getTree() {
    const space = await db.space.get(this.spaceId)
    if (!space) return null
    this.spaceNode = observable({
      cid: space.cid,
      root: true,
      filePath: space.filePath,
      name: space.name
    } as ISpaceNode)
    const docs = await db.file.where('spaceId').equals(space.cid).toArray()
    this.fileMap = new Map(docs.map(d => [d.filePath, d]))
    const filesTree = this.read(space.filePath)
    if (this.newNote.length) {
      const contents:string[] = []
      for (let n of this.newNote) {
        contents.push(readFileSync(n.filePath, {encoding: 'utf-8'}))
        const schemas = await parserMdToSchema(contents)
        schemas.map((s, i) => {
          try {
            this.newNote[i].schema = s
          } catch (e) {
            this.newNote[i].schema = EditorUtils.p
          }
        })
      }
    }
    const nodeTree = this.toNodeTree(filesTree)
    runInAction(() => this.spaceNode.children = nodeTree)
    return this.spaceNode
  }
}
