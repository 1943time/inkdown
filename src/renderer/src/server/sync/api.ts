import {readFileSync} from 'fs'
import {configStore} from '../../store/config'
import {createHmac} from 'crypto'
import {IBook, IDoc, IFile} from '../model'
import {ShareStore} from '../store'
export class ShareApi {
  minVersion = '0.2.0'
  constructor(
    private readonly store: ShareStore
  ) {}
  private http = window.api.createHttp({
    timeout: 30000,
    responseType: 'json',
    hooks: {
      beforeRequest: [req => {
        if (this.store.serviceConfig) {
          const time = Date.now()
          const config = this.config
          req.headers.authorization = createHmac('sha1', config.secret).update(time.toString(16) + req.url.pathname).digest('hex')
          req.headers.time = String(time)
          req.headers['device-id'] = config.deviceId
        }
      }],
      afterResponse: [async response => {
        // @ts-ignore
        if (response.body?.message) throw new Error(response.body?.message)
        return response
      }]
    }
  })
  upload(data: Record<string, any>, progressCallback?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.timeout = 60000
      const fileData = new FormData()
      Object.keys(data).forEach(key => fileData.append(key, data[key]))
      document.querySelector('input')!.addEventListener('change', e => {
        const el = e.target as HTMLInputElement
      })
      xhr.open('POST', `${this.config.domain}/api/upload`, true)
      xhr.upload.addEventListener('error', reject)
      xhr.upload.addEventListener('abort', reject)
      xhr.upload.addEventListener('timeout', reject)
      xhr.upload.addEventListener("loadstart", (event) => {
        progressCallback?.(0)
      })
      xhr.upload.addEventListener('progress', (event) => {
        progressCallback?.(+((event.loaded / event.total) * 100).toFixed(2))
      })
      xhr.upload.addEventListener('loadend', (event) => {
        progressCallback?.(100)
        resolve(xhr.response)
      })
      xhr.send(fileData)
    })
  }
  get config() {
    return this.store.serviceConfig!
  }
  connect(data: {
    machineId: string
    name: string
    secret: string
    domain: string
  }) {
    const time = Date.now()
    return window.api.got.post(`${data.domain}/api/bluestone`, {
      json: {
        name: data.name,
        machineId: data.machineId,
        time,
        sign: createHmac('sha1', data.secret).update(data.machineId + time.toString(16)).digest('hex')
      }
    }).json<{deviceId: string}>()
  }
  getShareData() {
    return this.http.get(`${this.config.domain}/api/bluestone?mode=shareData`).json<{
      docs: IDoc[],
      books: IBook[]
    }>()
  }
  prefetchDoc(data: {filePath: string}) {
    return this.http.post(`${this.config.domain}/api/doc`, {
      json: data
    }).json<{doc: IDoc, deps: IFile[]}>()
  }
  shareDoc(data: {
    id: string, schema: string, remove: string[], hash: string
  }) {
    return this.http.put(`${this.config.domain}/api/doc`, {
      json: data
    }).json()
  }
  getDocs(query: {page: number, pageSize: number}) {
    return this.http.get('ed/docs', {
      searchParams: query
    }).json<{list: any[], count: number}>()
  }
  getFiles(query: {page: number, pageSize: number}) {
    return this.http.get('api/file', {
      searchParams: query
    }).json<{list: any[]}>()
  }
  getFileData() {
    return this.http.get('ed/fileData').json<{total: number, size: number}>()
  }
  getBooks() {
    return this.http.get('ed/books').json<{list: any, count: number}>()
  }
  encrypt(data: {password: string, docId?: string, bookId?: string}) {
    return this.http.post('api/lock', {
      json: data
    })
  }
  unlock(data: {
    docId?: string
    bookId?: string
  }) {
    return this.http.post('api/lock', {json: data})
  }
  uploadDocFile(data: {
    filePath: string
    bookId?: string
    docId?: string
  }) {
    return window.api.uploadFile<{name: string}>({
      url: `${this.config.domain}/upload`,
      data: {
        ...data,
        file: {path: data.filePath}
      }
    }, this.http)
  }
  prefetchBook(data: {
    id?: string
    filePath: string
    path: string
    name: string
    config: {
      ignorePaths?: string
      strategy: 'auto' | 'custom',
      chapters?: any[]
    }
  } | {id: string}) {
    return this.http.post('ed/prefetchBook', {
      json: data
    }).json<{
      book: any,
      chapters: any[],
      files: {id: string, name: string, filePath: string}[]
    }>()
  }
  shareBook(data: {
    removeDocs: string[]
    removeFiles: string[]
    addChapters: any[],
    map: any,
    bookId: string
  }) {
    return this.http.post('ed/shareBook', {
      json: {
        removeDocs: data.removeDocs,
        removeFiles: data.removeFiles,
        addChapters: data.addChapters,
        map: data.map,
        bookId: data.bookId
      }
    }).json()
  }
  delDoc(id: string) {
    return this.http.delete(`${this.config.domain}/api/doc`, {
      searchParams: {id}
    })
  }
  checkBookPath(path: string) {
    return this.http.post('ed/checkBookPath', {
      json: {path}
    }).json<{exist: boolean}>()
  }
  delBook(id: string) {
    return this.http.post('ed/delBook', {
      json: {id}
    })
  }
}
