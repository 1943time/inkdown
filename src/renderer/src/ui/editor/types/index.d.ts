import {BaseSelection} from 'slate'
import {EditorStore} from '../store/editor'

export type ISpaceNode = {
  cid: string
  root: true
  name: string
  folder?: boolean
  filePath: string
  background?: string
  settings?: Record<string, any>
  $fd?: FileSystemDirectoryHandle
  $assets?: FileSystemDirectoryHandle
  children?: IFileItem[]
}

interface FileFolder {
  folder: true
  $f?: FileSystemDirectoryHandle
}

export interface IFileItem {
  cid: string
  parentId?: string
  root?: false
  path?: string
  name: string
  spaceId: string
  star?: boolean
  folder: boolean
  $fd?: FileSystemDirectoryHandle
  $f?: FileSystemFileHandle
  parent: IFileItem
  children?: IFileItem[]
  expand?: boolean
  changed?: boolean
  sort: number
  updated?: number
  schema?: any[]
  history?: any
  lastOpenTime?: number
  sel?: BaseSelection
  scrollTop?: number
  links?: string[]
}

export interface Tab {
  get current(): IFileItem | undefined
  history: IFileItem[]
  index: number
  hasNext: boolean
  hasPrev: boolean
  range?: Range
  store: EditorStore
  id: string
}

export type GetFields<T extends object> = {
  [P in keyof T]: T[P] extends Function ? never : P
}[keyof T]

export type Methods<T> = {
  [P in keyof T]: T[P] extends Function ? P : never
}[keyof T]
