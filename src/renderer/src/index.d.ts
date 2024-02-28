/// <reference types="electron-vite/node" />
import {EditorStore} from './editor/store'
import {BaseRange, BaseSelection} from 'slate'

export type ISpaceNode = {
  cid: string
  root: true
  filePath: string
  name: string
  children?: IFileItem[]
}
export type IFileItem = {
  cid: string
  filePath: string
  ext: string
  filename: string
  spaceId?: string
  folder: boolean
  parent?: IFileItem
  children?: IFileItem[]
  expand?: boolean
  editName?: string
  independent?: boolean
  changed?: boolean
  refresh?: boolean
  sort: number
  schema?: any[]
  history?: any
  lastOpenTime?: number
  sel?: BaseSelection
  hidden?: boolean
}
// export type IFileItem = ISpaceNode | IFileNode

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
