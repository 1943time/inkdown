import Dexie, {Table} from 'dexie'
import {nanoid} from 'nanoid'
import {readdirSync, statSync} from 'fs'
import {join} from 'path'
import {IFileItem} from '../index'

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
  cloud?: 0 | 1
  created?: number
  sort: number
  lastOpenTime: number
}
export interface IFile {
  cid: string
  filePath: string
  spaceId?: string
  folder: boolean
  schema?: object
  synced?: 0 | 1
  updated?: number
  created: number
  sort: number
  lastOpenTime?: number
  children?: IFile[]
}

class Db extends Dexie {
  public recent!: Table<IRecent, number>
  public history!: Table<IHistory, string>
  // public tag!: Table<ITag, string>
  // public tagFile!: Table<ITagFile, string>
  public file!: Table<IFile, string>
  public space!: Table<ISpace, string>
  public constructor() {
    super('db')
    this.version(8).stores({
      space: '&cid,name,filePath,cloud,sort',
      file: '&cid,filePath,sort,folder,synced,spaceId,lastOpenTime',
      recent: '&id,filePath,spaceId,sort',
      history: '&id,fileId,schema,spaceId,updated',
      // tag: '&id,title',
      // tagFile: '&id,filePath,tagId'
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
