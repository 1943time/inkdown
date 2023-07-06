import {Editor} from 'slate'
import {EditorStore} from './editor/store'

export interface IFileItem {
  id: string
  filePath: string
  ext?: string
  filename: string
  folder: boolean
  parent?: IFileItem
  children?: IFileItem[]
  expand?: boolean
  root?: boolean
  editName?: string
  independent?: boolean
  mode?: 'edit' | 'create'
  changed?: boolean
  refresh?: boolean
}

export interface Tab {
  get current(): IFileItem | undefined
  history: IFileItem[]
  refresh?: boolean
  index: number
  hasNext: boolean
  hasPrev: boolean
  store: EditorStore | null
  id: string
}

export type GetFields<T extends object> = {
  [P in keyof T]: T[P] extends Function ? never : P
}[keyof T]
