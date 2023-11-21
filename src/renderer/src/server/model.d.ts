
export interface IDoc {
  id: string
  filePath: string
  name: string
  modifyTime: string
  hash: string
  password: boolean
}

export interface IFile {
  id: string
  filePath: string
  name: string
  doc?: IDoc
  book?: IBook
  size: number
  created: string
}

export interface IBook {
  id: string
  path: string
  name: string
  filePath: string
  views: number
  updating: boolean
  config: {
    strategy: 'auto' | 'custom'
    chapters?: any[]
    ignorePaths?: string
  }
}

export interface IDevice {
  id: string
  name: string
  created: string
}
