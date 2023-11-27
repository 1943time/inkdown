import {createHmac} from 'crypto'
import {IBook, IDevice, IDoc, IFile} from '../model'
import {ShareStore} from '../store'
import {message$} from '../../utils'

export class ShareApi {
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
          req.headers.authorization = this.sign(time, req.url.pathname)
          req.headers.time = String(time)
          req.headers['device-id'] = config.deviceId
          req.headers['version'] = this.store.minVersion
        }
      }],
      afterResponse: [async response => {
        const body = response.body as Record<any, any>
        // @ts-ignore
        if (body?.message) {
          throw new Error(body.message)
        }
        return response
      }],
      beforeError: [async res => {
        message$.next({
          type: 'error',
          content: res.message
        })
        return res
      }]
    }
  })
  private sign(time: number, factor: string) {
    return createHmac('sha1', this.config.secret).update(this.config.deviceId + time.toString(16) + factor).digest('hex')
  }
  upload(data: Record<string, any>, progressCallback?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.timeout = 60000
      const fileData = new FormData()
      Object.keys(data).forEach(key => fileData.append(key, data[key]))
      xhr.open('POST', `${this.config.domain}/api/upload`, true)
      const time = Date.now()
      const path = '/api/upload'
      xhr.setRequestHeader('Authorization', this.sign(time, path))
      xhr.setRequestHeader('device-id', this.config.deviceId)
      xhr.setRequestHeader('time', String(time))
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
  getVersion() {
    return this.http.get(`${this.config.domain}/api/bluestone`).json<{version: string}>()
  }
  setPreferences(data: Record<string, any>) {
    return this.http.post(`${this.config.domain}/api/data`, {
      json: {
        mode: 'preferences',
        data
      }
    }).json()
  }
  connect(data: {
    machineId: string
    name: string
    secret: string
    domain: string
    preferences: {
      codeTabSize: number
      codeTheme: string
      codeLineNumber: boolean
    }
  }) {
    const time = Date.now()
    return window.api.got.post(`${data.domain}/api/bluestone`, {
      json: {
        name: data.name,
        machineId: data.machineId,
        time,
        preferences: data.preferences,
        sign: createHmac('sha1', data.secret).update(data.machineId + time.toString(16)).digest('hex')
      }
    }).json<{deviceId: string}>()
  }
  getShareData() {
    return this.http.get(`${this.config.domain}/api/data`).json<any>().then<{
      docs: IDoc[],
      books: IBook[]
    }>(res => {
      res.books = res.books.map(b => {
        b.config = JSON.parse(b.config || '{}')
        return b
      })
      return res
    })
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
  getDocs(query: {page: number, pageSize: number, all?: boolean | string}) {
    return this.http.get(`${this.config.domain}/api/doc`, {
      searchParams: query
    }).json<{list: any[], total: number}>()
  }
  getFiles(query: {page: number, pageSize: number, docId?: string, bookId?: string, all?: boolean | string}) {
    return this.http.get(`${this.config.domain}/api/file`, {
      searchParams: query
    }).json<{list: any[], total: number}>()
  }
  getBooks(data: {
    page: number
    pageSize: number
    all?: boolean | string
  }) {
    return this.http.get(`${this.config.domain}/api/book`, {
      searchParams: data
    }).json<{list: any, total: number}>()
  }
  uploadDocFile(data: {
    filePath: string
    bookId?: string
    docId?: string
  }) {
    return window.api.uploadFile<{name: string}>({
      url: `${this.config.domain}/api/file`,
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
    return this.http.post(`${this.config.domain}/api/book`, {
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
    texts: string
  }) {
    return this.http.put(`${this.config.domain}/api/book`, {
      json: {
        removeDocs: data.removeDocs,
        removeFiles: data.removeFiles,
        addChapters: data.addChapters,
        map: data.map,
        bookId: data.bookId,
        texts: data.texts
      }
    }).json<{book: IBook}>()
  }
  delDoc(id: string) {
    return this.http.delete(`${this.config.domain}/api/doc`, {
      searchParams: {id}
    })
  }
  checkBookPath(path: string) {
    return this.http.get(`${this.config.domain}/api/book`, {
      searchParams: {path}
    }).json<{book?: IBook}>()
  }
  findBookByFilepath(filePath: string) {
    return this.http.get(`${this.config.domain}/api/book`, {
      searchParams: {filePath}
    }).json<{book?: IBook}>()
  }
  delBook(id: string) {
    return this.http.delete(`${this.config.domain}/api/book`, {
      searchParams: {id}
    })
  }
  upgrade() {
    return new Promise((resolve, reject) => {
      this.http.post(`${this.config.domain}/api/device`).then(() => {
        const timeout = Date.now() + 300 * 1000
        const polling = () => {
          this.getVersion().then((res) => {
            resolve(res.version)
          }).catch(() => {
            if (Date.now() > timeout) {
              reject()
            } else {
              setTimeout(polling, 1000)
            }
          })
        }
        setTimeout(polling, 3000)
      }).catch(reject)
    })
  }
  getDevices(data: {
    page: number, pageSize: number
  }) {
    return this.http.get(`${this.config.domain}/api/device`, {
      searchParams: data
    }).json<{list: IDevice[], total: number}>()
  }

  delDevice(id: string) {
    return this.http.delete(`${this.config.domain}/api/device`, {
      searchParams: {id}
    })
  }
}
