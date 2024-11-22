import { action, makeAutoObservable, runInAction } from 'mobx'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { ShareApi } from './sync/api'
import { IBook, IDoc } from './model'
import { BsFile } from './sync/file'
import { Book } from './sync/book'
import { parserMdToSchema } from '../editor/parser/parser'
import { MainApi } from '../api/main'
import { compareVersions } from 'compare-versions'
import { message$ } from '../utils'
import { join, parse } from 'path'
import { IFileItem, ISpaceNode } from '../types/index'
import { db } from '../store/db'
import { slugify } from '../editor/utils/dom'

export class ShareStore {
  readonly minVersion = '0.5.0'
  remoteVersion = ''
  currentVersion = ''
  docMap = new Map<string, IDoc>()
  bookMap = new Map<string, IBook>()
  file: BsFile
  book: Book
  pausedUpdate = false
  showUpdateTips = false
  updateTips = ''
  serviceConfig: null | {
    domain: string
    secret: string
    name: string
    deviceId: string
  } = null
  api: ShareApi
  private changedDocs: {from: string, to: string}[] = []
  private changedBooks: {from: string, to: string}[] = []
  constructor() {
    this.api = new ShareApi(this)
    this.file = new BsFile(this.api)
    this.book = new Book(this.api, this.file)
    makeAutoObservable(this, {
      file: false,
      book: false,
      docMap: false,
      bookMap: false
    })
  }
  private detectFolderFiles(from: string, to: string) {
    for (let f of readdirSync(to)) {
      const sf = join(from, f), st = join(to, f)
      const stat = statSync(st)
      if (this.docMap.get(sf)) {
        this.changedDocs.push({from: sf, to: st})
      }
      if (this.bookMap.get(sf) && stat.isDirectory()) {
        this.changedBooks.push({from: sf, to: st})
      }
      if (stat.isDirectory()) {
        this.detectFolderFiles(sf, st)
      }
    }
  }
  renameFilePath(from: string, to: string) {
    if (this.serviceConfig && existsSync(to)) {
      this.changedDocs = []
      this.changedBooks = []
      if (statSync(to).isDirectory()) {
        if (this.bookMap.get(from)) {
          this.changedBooks.push({from, to})
        }
        this.detectFolderFiles(from, to)
      } else {
        if (this.docMap.get(from)) {
          this.changedDocs = [{from, to}]
        }
        if (this.bookMap.get(from)) {
          this.changedBooks = [{from, to}]
        }
      }
      if (this.changedDocs.length) {
        this.api.updateFilePath({
          mode: 'updateDocs',
          files: this.changedDocs
        }).then(res => {
          res.docs?.map(d => this.docMap.set(d.filePath, d))
        })
      }
      if (this.changedBooks.length) {
        this.api.updateFilePath({
          mode: 'updateBooks',
          files: this.changedBooks
        }).then(res => {
          for (let b of this.changedBooks) {
            this.bookMap.delete(b.from)
          }
          res.books?.map(d => {
            this.bookMap.set(d.filePath, d)
          })
        })
      }
    }
  }
  getBooks(filePath: string) {
    if (!filePath) return []
    return Array.from(this.bookMap).filter(item => item[1].filePath.startsWith(filePath)).map(item => item[1])
  }
  initial() {
    MainApi.getServerConfig().then(async res => {
      if (res) {
        runInAction(() => this.serviceConfig = res)
        try {
          const v = await this.api.getVersion()
          runInAction(() => this.currentVersion = v.version)
          if (v.version !== localStorage.getItem('ignore-service-version') && !shareStore.pausedUpdate) {
            if (compareVersions(this.minVersion, v.version) === 1) {
              fetch('https://api.github.com/repos/1943time/bluestone-service/releases/latest').then(async res => {
                const data = await res.json() as {
                  tag_name: string
                  body: string
                }
                if (!/-\w+$/.test(data.tag_name) || import.meta.env.DEV) {
                  runInAction(() => {
                    this.updateTips = data.body
                    this.showUpdateTips = true
                    this.remoteVersion = data.tag_name
                  })
                }
              })
            }
          }
          await this.api.getShareData().then(action(res => {
            this.docMap = new Map(res.docs.map(c => [c.filePath, c]))
            this.bookMap = new Map(res.books.map(c => [c.filePath, c]))
          }))
        } catch (e) {
          console.log('e', e)
          // message$.next({
          //   type: 'error',
          //   content: configStore.zh ? '服务连接失败' : 'Custom service connection failed'
          // })
        }
      }
    })
  }

  async shareDoc(filePath: string, root = '') {
    const remote = await this.api.prefetchDoc({filePath})
    const md = readFileSync(filePath, {encoding: 'utf-8'})
    const hash = window.api.md5(md)
    if (hash !== remote.doc.hash) {
      const [res] = await parserMdToSchema([{filePath: '', code: md}])
      const filesSet = await this.file.docFile({
        schema: res.schema, docId: remote.doc.id, files: remote.deps, filePath, root
      })
      const remove = remote.deps.filter(d => !filesSet.has(d.filePath)).map(d => d.id)
      const name = parse(filePath).name
      res.schema.unshift({
        type: 'head', level: 1,
        id: slugify(name),
        title: name,
        children: [{text: name}]
      })
      await this.api.shareDoc({
        id: remote.doc.id, schema: JSON.stringify(res.schema), remove, hash: hash
      })
    }
    this.docMap.set(remote.doc.filePath, remote.doc)
    return remote.doc
  }

  async shareBook(data: Partial<IBook>) {
    // let node: ISpaceNode | IFileItem | null = data.filePath === treeStore.root!.filePath ? treeStore.root : null
    // if (!node) {
    //   const file = await db.file.where('filePath').equals(data.filePath!).and(x => x.spaceId === treeStore.root!.cid).first()
    //   node = treeStore.nodeMap.get(file?.cid!) || null
    // }
    // if (node) {
    //   return this.book.syncBook(data, node).then(res => {
    //     if (res) {
    //       this.bookMap.set(res.book.filePath, res.book)
    //       return res
    //     }
    //     return null
    //   })
    // }
    // return null
  }

  async delBook(book: IBook) {
    return this.api.delBook(book.id).then(() => this.bookMap.delete(book.filePath))
  }

  clear() {
    this.docMap.clear()
    this.bookMap.clear()
  }

  reset() {
    return MainApi.saveServerConfig(null).then(() => {
      this.docMap.clear()
      this.bookMap.clear()
      runInAction(() => {
        this.serviceConfig = null
      })
    })
  }
  async delDevice(id: string) {
    return this.api.delDevice(id).then(async () => {
      if (id === this.serviceConfig?.deviceId) {
        this.docMap.clear()
        this.bookMap.clear()
        runInAction(() => {
          this.serviceConfig = null
        })
        await window.electron.ipcRenderer.invoke('saveServerConfig', null)
      }
    })
  }
}

export const shareStore = new ShareStore()
