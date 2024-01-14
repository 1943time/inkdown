import Dexie, {Table} from 'dexie'
import {nanoid} from 'nanoid'
import {readdirSync, statSync} from 'fs'
import {join, parse} from 'path'

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
  filePath?: string
  folder: boolean
  parentId?: string
  children?: IBookMark[]
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
      bookmark: '&id,title,&filePath,parentId'
    })
  }
  async checkRenameFolder(from: string, to: string) {
    try {
      const fileMap = new Map<string, string>()
      const files = readdirSync(to)
      for (const f of files) {
        if (statSync(join(to, f)).isDirectory()) {
          this.checkRenameFolder(join(from, f), join(to, f))
        } else {
          fileMap.set(join(from, f), join(to, f))
        }
      }
      if (fileMap.size) {
        const records = await this.bookmark.where('filePath').anyOf(Object.keys(fileMap)).toArray()
        for (const item of records) {
          this.bookmark.where('id').equals(item.id!).modify({
            filePath: fileMap.get(item.filePath!)
          })
        }
      }
    } catch (e) {
      console.error('checkRenameFolder', e)
    }
  }
  async removeFolderBookmark(filePath: string) {
    try {
      const removePaths = [filePath]
      const stack = readdirSync(filePath).map(f => join(filePath, f))
      while (stack.length) {
        const item = stack.pop()!
        if (statSync(item).isDirectory()) {
          stack.push(...readdirSync(item).map(f => join(item, f)))
        } else {
          removePaths.push(item)
        }
      }
      await this.bookmark.where('filePath').anyOf(removePaths).delete()
    } catch (e) {
      console.error('removeFolderBookmark', e)
    }
  }
  async removeBookmarkGroup(bookmark: IBookMark) {
    try {
      const removeIds = [bookmark.id!]
      const stack = bookmark.children?.slice() || []
      while (stack.length) {
        const item = stack.pop()!
        removeIds.push(item.id!)
        if (item.folder && item.children?.length) {
          stack.push(...item.children)
        }
      }
      await this.bookmark.where('id').anyOf(removeIds).delete()
    } catch (e) {
      console.error('removeFolderBookmark', e)
    }
  }
  async getBookmarkTree() {
    let records = await this.bookmark.toArray()
    records = records.sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1
      else return a.title > b.title ? 1 : -1
    })
    const groups:IBookMark[] = []
    const top:IBookMark[] = []
    const groupMap = new Map<string, IBookMark[]>()
    for (const item of records) {
      if (!item.parentId) {
        top.push(item)
      } else {
        if (!groupMap.get(item.parentId)) groupMap.set(item.parentId, [])
        groupMap.get(item.parentId)!.push(item)
      }
      if (item.folder) {
        groups.push(item)
      }
    }
    for (const g of groups) {
      g.children = groupMap.get(g.id!) || []
    }
    return top
  }

  async addBookmark(filePath: string, parentId?: string) {
    const record = await this.bookmark.where('filePath').equals(filePath).first()
    if (record) {
      await this.bookmark.where('id').equals(record.id!).modify({
        parentId
      })
    } else {
      await this.bookmark.add({
        id: nanoid(),
        folder: false,
        title: parse(filePath).name,
        filePath: filePath,
        parentId
      })
    }
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
