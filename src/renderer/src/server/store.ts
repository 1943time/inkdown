import {action, makeAutoObservable, runInAction} from 'mobx'
import {readFileSync} from 'fs'
import {ShareApi} from './sync/api'
import {IBook, IDoc} from './model'
import {BsFile} from './sync/file'
import {Book} from './sync/book'
import {parserMdToSchema} from '../editor/parser/parser'

export interface BookData {
  path: string,
  filePath: string,
  ignorePaths?: string
  name: string,
  strategy: 'auto' | 'custom',
  chapters?: any[]
}

export class ShareStore {
  docMap = new Map<string, IDoc>()
  bookMap = new Map<string, IBook>()
  file: BsFile
  book: Book
  serviceConfig: null | {
    domain: string
    secret: string
    name: string
    deviceId: string
  } = null
  api: ShareApi
  constructor() {
    this.api = new ShareApi(this)
    this.file = new BsFile(this.api)
    this.book = new Book(this.api, this.file)
    makeAutoObservable(this, {
      file: false,
      book: false
    })
  }
  getBooks(filePath: string) {
    return Array.from(this.bookMap).filter(item => item[1].filePath.startsWith(filePath)).map(item => item[1])
  }

  initial() {
    window.electron.ipcRenderer.invoke('getServerConfig').then(res => {
      if (res) {
        runInAction(() => this.serviceConfig = res)
        this.api.getShareData().then(action(res => {
          this.docMap = new Map(res.docs.map(c => [c.filePath, c]))
          this.bookMap = new Map(res.books.map(c => [c.path, c]))
        }))
      }
    })
  }

  async shareDoc(filePath: string, root = '') {
    const remote = await this.api.prefetchDoc({filePath})
    const md = readFileSync(filePath, {encoding: 'utf-8'})
    const hash = window.api.md5(md)
    if (hash !== remote.doc.hash) {
      const [schema] = await parserMdToSchema([md])
      const filesSet = await this.file.docFile({
        schema, docId: remote.doc.id, files: remote.deps, filePath, root
      })
      const remove = remote.deps.filter(d => !filesSet.has(d.filePath)).map(d => d.id)
      await this.api.shareDoc({
        id: remote.doc.id, schema: JSON.stringify(schema), remove, hash: hash
      })
    }
    this.docMap.set(remote.doc.filePath, remote.doc)
    return remote.doc
  }

  // async delDoc(id: string, filePath: string) {
  //   return shareApi.delDoc(id).then(() => this.docMap.delete(filePath))
  // }

  async shareBook(data: Partial<IBook>) {
    return this.book.syncBook(data)
  }

  // async delBook(book: ShareBook) {
  //   return shareApi.delBook(book.id).then(() => this.bookMap.delete(book.filePath))
  // }
  clear() {
    this.docMap.clear()
    this.bookMap.clear()
  }
}

export const shareStore = new ShareStore()
