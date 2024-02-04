import {IFileItem} from '../index'
import {readdirSync, statSync} from 'fs'
import {basename, extname, join, parse, sep} from 'path'
import {observable} from 'mobx'
import {nanoid} from 'nanoid'

export const defineParent = (node: IFileItem, parent: IFileItem) => {
  Object.defineProperty(node, 'parent', {
    configurable: true,
    get() {
      return parent
    }
  })
}

export const createFileNode = (params: {
  folder: boolean
  parent?: IFileItem
  filePath: string
  mode?: IFileItem['mode']
  editName?: string
  copyItem?: IFileItem
  hidden?: boolean
}) => {
  const name = params.folder ? params.filePath.split(sep).pop() : parse(params.filePath).name
  const node = {
    id: nanoid(),
    filename: name,
    editName: params.editName,
    folder: params.folder,
    children: params.folder ? [] : undefined,
    mode: params.mode,
    filePath: params.filePath,
    schema: undefined,
    history: undefined,
    sel: undefined,
    copyItem: params.copyItem,
    hidden: params.hidden,
    ext: params.folder ? undefined : extname(params.filePath).replace(/^\./, ''),
  } as IFileItem
  if (params.parent) {
    defineParent(node, params.parent)
  } else {
    node.independent = true
  }
  return observable(node, {
    schema: false,
    sel: false,
    history: false
  })
}
const readDir = (path: string, parent: IFileItem) => {
  const files = readdirSync(path)
  let tree: IFileItem[] = []
  for (let f of files) {
    const filePath = join(path, f)
    const s = statSync(filePath)
    if (s.isDirectory()) {
      const node = createFileNode({
        folder: true,
        parent: parent,
        filePath: join(path, f),
        hidden: f.startsWith('.')
      })
      node.children = readDir(filePath, node)
      tree.push(node)
    } else {
      const node = createFileNode({
        folder: false,
        parent: parent,
        filePath: join(path, f),
        hidden: f.startsWith('.')
      })
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
  root.children = readDir(dirPath, root)
  return {root}
}
