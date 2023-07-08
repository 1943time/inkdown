import Dexie, {Table} from 'dexie'

export interface Doc {
  id?: string
  name: string
  filePath: string
  hash: string
  updated: string
}

export interface Book{
  id?: number
  name: string
  path: string
  strategy: 'auto' | 'custom'
  ignorePaths: string
  map?: string
  filePath: string
  config?: Record<string, any>
  updated: string
}

export interface Chapter {
  id?: number
  filePath: string
  // hash filepath
  path: string
  bookId: number
  hash?: string
  name: string
  updated: string
}

export interface DocFile {
  id?: number
  filePath: string
  hash: string
}
class Db extends Dexie {
  public doc!: Table<Doc, number>
  public book!: Table<Book, number>
  public chapter!: Table<Chapter, number>
  public file!: Table<DocFile, number>

  public constructor() {
    super('db')
    this.version(1).stores({
      doc: '&id,name,filePath,hash,updated',
      book: '++id,path,name,strategy,map,filePath,ignorePaths,config,updated',
      chapter: '++id,filePath,bookId,path,hash,name,updated',
      file: '++id,filePath,hash'
    })
  }
}

export const db = new Db()
