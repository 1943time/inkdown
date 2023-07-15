import Dexie, {Table} from 'dexie'
export interface Ebook {
  id?: number
  map?: string
  strategy: 'auto' | 'custom'
  name: string
  filePath: string
  ignorePaths?: string
}

export interface IRecent {
  id?: number
  filePath: string
}

export interface IQuickOpen {
  id?: number
  filePath: string
  dirPath: string
}
class Db extends Dexie {
  public ebook!: Table<Ebook, number>
  public recent!: Table<IRecent, number>
  public quickOpen!: Table<IQuickOpen, number>

  public constructor() {
    super('db')
    this.version(3).stores({
      ebook: '++id,filePath,strategy,name,map,ignorePaths',
      recent: '++id,&filePath',
      quickOpen: '++id,filePath,dirPath'
    })
  }
}

export const db = new Db()

export const appendRecentDir = async (filePath: string) => {
  const item = await db.recent.where('filePath').equals(filePath).first()
  if (item) {
    db.recent.delete(item.id!)
    db.recent.add({filePath})
  } else {
    await db.recent.add({
      filePath
    })
    if (await db.recent.count() > 5) {
      const first = await db.recent.limit(1).first()
      await db.recent.delete(first!.id!)
    }
  }
}


export const appendRecentNote = async (filePath: string, dirPath: string) => {
  const item = await db.quickOpen.where('dirPath').equals(dirPath).first()
  if (item) {
    db.recent.delete(item.id!)
    db.quickOpen.add({
      filePath, dirPath
    })
  } else {
    db.quickOpen.add({
      filePath, dirPath
    })
    if (await db.quickOpen.where('dirPath').equals(dirPath).count() > 100) {
      const first = await db.quickOpen.where('dirPath').equals(dirPath).limit(1).first()
      await db.quickOpen.delete(first!.id!)
    }
  }
}
