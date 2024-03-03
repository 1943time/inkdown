import {IFileItem, ISpaceNode} from '../index'
import {readdirSync, readFileSync, statSync} from 'fs'
import {basename, extname, join, parse, sep} from 'path'
import {observable, runInAction} from 'mobx'
import {db, IFile} from './db'
import {message$, nid} from '../utils'
import {openMdParserHandle} from '../editor/parser/parser'
import {EditorUtils} from '../editor/utils/editorUtils'
import {mediaType} from '../editor/utils/dom'
import {readFile} from 'fs/promises'
export const defineParent = (node: IFileItem, parent: IFileItem | ISpaceNode) => {
  Object.defineProperty(node, 'parent', {
    configurable: true,
    get() {
      return parent
    }
  })
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
    ext: file.folder ? undefined : extname(file.filePath).replace(/^\./, ''),
  } as IFileItem
  if (parent) {
    defineParent(node, parent)
  }
  return observable(node, {
    schema: false,
    sel: false,
    history: false,
    sort: false
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
      else return a.name > b.name ? - 1 : 1
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
      const {parser, terminate} = openMdParserHandle()
      try {
        for (let i = 0 ; i <= this.newNote.length; i += 30) {
          const stack = this.newNote.slice(i, i + 30)
          const contents:string[] = []
          for (let n of stack) {
            contents.push(await readFile(n.filePath, {encoding: 'utf-8'}))
          }
          const schemas = await parser(contents)
          stack.map((s, i) => {
            try {
              stack[i].schema = schemas[i]
              db.file.update(s.cid, {schema: schemas[i]})
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
    console.log('new', this.newNote.length)
    const nodeTree = this.toNodeTree(filesTree)
    runInAction(() => this.spaceNode.children = nodeTree)
    return {space: this.spaceNode, nodeMap: this.nodeMap}
  }
}
