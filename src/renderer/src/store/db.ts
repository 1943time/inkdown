import Dexie, { Table } from 'dexie'
import { nanoid } from 'nanoid'
import { IFileItem } from '../types/index'

export interface IRecent {
  id: string
  fileId: string
  spaceId?: string
  current?: boolean
  sort: number
}

export interface IHistory {
  id?: string
  fileId: string
  schema: any[]
  spaceId?: string
  updated: number
}

export interface ITag {
  id: string
  title: string
  config?: Record<string, any>
  children?: ITagFile[]
}

export interface ITagFile {
  id: string
  fileId: string
  tagId: string
}

export interface ISpace {
  cid: string
  name: string
  filePath: string
  created?: number
  sort: number
  lastOpenTime: number
  imageFolder?: string
  relative?: boolean
  background?: string
}
export interface IFile {
  cid: string
  filePath: string
  spaceId?: string
  folder: boolean
  published?: boolean
  schema?: object
  synced?: 0 | 1
  updated?: number
  created: number
  sort: number
  lastOpenTime?: number
  children?: IFile[]
  links?: {path: number[], target: string}[]
}

export interface IConfig {
  key: string
  value: any
}

class Db extends Dexie {
  public recent!: Table<IRecent, number>
  public history!: Table<IHistory, string>
  public file!: Table<IFile, string>
  public space!: Table<ISpace, string>
  public config!: Table<IConfig, string>
  public constructor() {
    super('db')
    this.version(10).stores({
      space: '&cid,name,filePath,sort',
      file: '&cid,filePath,sort,folder,synced,spaceId',
      recent: '&id,filePath,spaceId,sort',
      history: '&id,fileId,spaceId,updated',
      config: '&key'
    })
  }
  async saveRecord(node: IFileItem) {
    if (node.ghost) return
    try {
      let records = await db.history.where('fileId').equals(node.cid).toArray()
      records = records.sort((a, b) => a.updated > b.updated ? 1 : -1)
      const last = records[records.length - 1]
      const now = Date.now()
      if (last && now < last.updated + 600 * 1000) {
        await db.history.where('id').equals(last.id!).modify({
          schema: node.schema,
          updated: now
        })
      } else {
        await db.history.add({
          id: nanoid(),
          schema: node.schema!,
          fileId: node.cid,
          updated: now
        })
        if (records.length >= 15) {
          const first = records[0]
          await db.history.where('id').equals(first!.id!).delete()
        }
      }
    } catch (e) {console.error(e)}
  }
}

export const db = new Db()
