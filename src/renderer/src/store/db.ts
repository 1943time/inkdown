import Dexie, {Table} from 'dexie'
import {nanoid} from 'nanoid'

export interface IRecent {
  id?: string
  filePath: string
  time: number
}

export interface IQuickOpen {
  id?: string
  filePath: string
  dirPath: string
  time: number
}

export interface IHistory {
  id?: string
  filePath: string
  schema: any[]
  updated: number
}

export interface IBookMark {
  id?: string
  title: string
  path?: string
  folder: boolean
  parentId?: string
}

class Db extends Dexie {
  public recent!: Table<IRecent, number>
  public quickOpen!: Table<IQuickOpen, number>
  public history!: Table<IHistory, string>
  public bookmark!: Table<IBookMark, string>
  public constructor() {
    super('db')
    this.version(6).stores({
      recent: '&id,&filePath',
      quickOpen: '&id,filePath,dirPath',
      history: '&id,filePath,schema,updated',
      bookmark: '&id,title,path,parentId'
    })
  }
}

export const db = new Db()

export const clearExpiredRecord = async () => {
  const time = localStorage.getItem('clear-records-time')
  const expiration = Date.now() - (90 * 3600 * 24 * 1000)
  if (!time || +time < expiration) {
    localStorage.setItem('clear-records-time', String(Date.now()))
    await db.history.filter(obj => {
      return obj.updated < expiration
    }).delete()
  }
}
export const removeFileRecord = async (filePath: string, targetFilePath?: string) => {
  try {
    if (!targetFilePath) {
      await db.history.where('filePath').equals(filePath).delete()
    } else {
      await db.history.where('filePath').equals(filePath).modify({
        filePath: targetFilePath
      })
    }
  } catch (e) {console.error(e)}
}
export const saveRecord = async (filePath: string, schema: any[]) => {
  try {
    let records = await db.history.where('filePath').equals(filePath).toArray()
    records = records.sort((a, b) => a.updated > b.updated ? 1 : -1)
    const last = records[records.length - 1]
    const now = Date.now()
    if (last && now < last.updated + 600 * 1000) {
      await db.history.where('id').equals(last.id!).modify({
        schema: schema,
        updated: now
      })
    } else {
      await db.history.add({
        id: nanoid(),
        schema,
        filePath,
        updated: now
      })
      if (records.length >= 15) {
        const first = records[0]
        await db.history.where('id').equals(first!.id!).delete()
      }
    }
  } catch (e) {console.error(e)}
}
export const appendRecentDir = async (filePath: string) => {
  const item = await db.recent.where('filePath').equals(filePath).first()
  if (item) {
    await db.recent.where('id').equals(item.id!).modify({
      time: Date.now()
    })
  } else {
    await db.recent.add({
      filePath, id: nanoid(), time: Date.now()
    })
    if (await db.recent.count() > 5) {
      const records = await db.recent.toArray()
      const old = records.sort((a, b) => a.time < b.time ? -1 : 1)[0]
      await db.recent.where('id').equals(old.id!).delete()
    }
  }
}

let timer = 0
export const appendRecentNote = async (filePath: string, dirPath: string) => {
  clearTimeout(timer)
  timer = window.setTimeout(async () => {
    const item = await db.quickOpen.filter(obj => obj.dirPath === dirPath && obj.filePath === filePath).first()
    if (item) {
      await db.quickOpen.where('id').equals(item.id!).modify({
        time: Date.now()
      })
    } else {
      await db.quickOpen.add({
        filePath, dirPath, id: nanoid(), time: Date.now()
      })
      if (await db.quickOpen.where('dirPath').equals(dirPath).count() > 100) {
        const records = await db.quickOpen.toArray()
        const old = records.sort((a, b) => a.time < b.time ? -1 : 1)[0]
        await db.quickOpen.where('id').equals(old.id!).delete()
      }
    }
  }, 100)
}
