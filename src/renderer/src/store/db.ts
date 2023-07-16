import Dexie, {Table} from 'dexie'
import {nanoid} from 'nanoid'
export interface Ebook {
  id?: number
  map?: string
  strategy: 'auto' | 'custom'
  name: string
  filePath: string
  ignorePaths?: string
}

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
class Db extends Dexie {
  public ebook!: Table<Ebook, number>
  public recent!: Table<IRecent, number>
  public quickOpen!: Table<IQuickOpen, number>

  public constructor() {
    super('db')
    this.version(3).stores({
      ebook: '++id,filePath,strategy,name,map,ignorePaths',
      recent: '&id,&filePath',
      quickOpen: '&id,filePath,dirPath'
    })
  }
}

export const db = new Db()

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
