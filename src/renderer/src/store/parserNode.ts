import {IFileItem} from '../index'
import {readdirSync, statSync} from 'fs'
import {basename, extname, join, parse} from 'path'
import {observable} from 'mobx'
import {nanoid} from 'nanoid'

export const defineParent = (node: IFileItem, parent: IFileItem) => {
  Object.defineProperty(node, 'parent', {
    configurable: true,
    get() {
      return parent
    }
  })
  Object.defineProperty(node, 'filePath', {
    configurable: true,
    get() {
      let cur:IFileItem | undefined = this.parent
      const paths = [this.filename]
      if (cur) paths.unshift(cur.filePath)
      let path = join(...paths)
      if (!this.folder) {
        path += `.${this.ext}`
      }
      return path
    }
  })
}
export const createFileNode = (params: {
  fileName: string
  folder: boolean
  parent?: IFileItem
  filePath?: string
  mode?: IFileItem['mode']
}) => {
  const p = params.folder ? params.fileName : parse(params.fileName).name
  const node = {
    id: nanoid(),
    filename: p,
    folder: params.folder,
    children: params.folder ? [] : undefined,
    mode: params.mode,
    ext: params.folder ? undefined : extname(params.fileName).replace(/^\./, ''),
  } as IFileItem
  if (params.parent) {
    defineParent(node, params.parent)
  } else if (params.filePath) {
    node.filePath = params.filePath
    node.independent = true
  }

  return observable(node)
}
const readDir = (path: string, parent: IFileItem, cacheFiles:IFileItem[]) => {
  const files = readdirSync(path)
  let tree: IFileItem[] = []
  for (let f of files) {
    if (f.startsWith('.') && f !== '.images') continue
    const filePath = join(path, f)
    const s = statSync(filePath)
    if (s.isDirectory()) {
      const node = createFileNode({
        fileName: f,
        folder: true,
        parent: parent
      })
      node.children = readDir(filePath, node, cacheFiles)
      tree.push(node)
    } else {
      const node = createFileNode({
        fileName: f,
        folder: false,
        parent: parent
      })
      if (['md', 'markdown'].includes(node.ext!)) {
        cacheFiles.push(node)
      }
      tree.push(node)
    }
  }
  return observable(sortFiles(tree))
}

export const sortFiles = (nodes: IFileItem[]) => {
  return nodes.sort((a, b) => {
    if (a.folder !== b.folder) return a.folder ? -1 : 1
    else return a.filename > b.filename ? 1 : -1
  })
}
export const parserNode = (dirPath: string) => {
  const root:IFileItem = observable({
    root: true,
    filePath: dirPath,
    filename: basename(dirPath),
    folder: true,
    id: nanoid()
  })
  const files:IFileItem[] = []
  root.children = readDir(dirPath, root, files)
  return {root, files}
}
