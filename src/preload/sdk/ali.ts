import {createHmac} from 'crypto'
import got from 'got'
import {parseString} from 'xml2js'
import {createReadStream} from 'fs'
import {ServerSdk} from './index'
import mime from 'mime-types'
interface Config {
  accessKeyId: string
  accessKeySecret: string
  region: string
  bucket: string
  domain: string
}
const toJson = (str: string) => new Promise((resolve, reject) => {
  parseString(str, (err, result) => {
    if (err) return reject(err)
    resolve(result)
  })
})

const http = got.extend({
  hooks: {
    afterResponse: [async response => {
      if (response.headers['content-type'] === 'application/xml') {
        response.body = await toJson(response.body as string)
      }
      return response
    }],
    beforeError: [async e => {
      if (e.response && e.response.headers['content-type'] === 'application/xml') {
        e.response.body = await toJson(e.response.body as string)
        return e
      }
      return e
    }]
  }
})
export class AliApi implements ServerSdk {
  constructor(
    private readonly config: Config
  ) {}

  async connect() {
    const header = this.getHeaders({
      method: 'GET',
      bucket: this.config.bucket,
      headers: {},
      object: 'index.html'
    })
    const res = await http.get(`https://${this.config.bucket}.${this.config.region}.aliyuncs.com/index.html`, {
      headers: header
    }).catch(e => {
      if (!e.response.body) throw new Error('链接失败，请检查链接参数')
      return e.response?.body
    })
    if (res?.Error?.Code?.[0] === 'SignatureDoesNotMatch') {
      throw new Error('链接失败，请检查链接参数')
    }
    return res
  }
  async initial(files: {name: string, filePath: string, contentType: string}[]) {
    return Promise.all(files.map(f => {
      return this.uploadFile(f.name, f.filePath, f.contentType)
    }))
  }

  async reset(files) {
    return Promise.all(files!.map(f => {
      return this.uploadFile(f.name, f.filePath, f.contentType)
    }))
  }
  async syncDoc(name: string, content: string) {
    const header = this.getHeaders({
      method: 'PUT',
      bucket: this.config.bucket,
      headers: {
        'Content-Type': 'text/html'
      },
      object: name
    })
    await http.put(`https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${name}`, {
      headers: header,
      body: content
    })
    return `${this.config.domain}/${name}`
  }
  async removeFile(name: string) {
    const header = this.getHeaders({
      method: 'DELETE',
      bucket: this.config.bucket,
      object: name
    })
    return http.delete(`https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${name}`, {
      headers: header
    })
  }
  uploadFile(name: string, filePath: string, contentType?: string) {
    const header = this.getHeaders({
      method: 'PUT',
      bucket: this.config.bucket,
      headers: {
        'Content-Type': mime.lookup(filePath) || ''
      },
      object: name
    })
    return http.put(`https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${name}`, {
      headers: header,
      body: createReadStream(filePath)
    })
  }

  uploadFileByText(name: string, content: string): Promise<any> {
    const header = this.getHeaders({
      method: 'PUT',
      bucket: this.config.bucket,
      headers: {
        'Content-Type': mime.lookup(name) || ''
      },
      object: name
    })
    return http.put(`https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${name}`, {
      headers: header,
      body: content
    })
  }

  private getHeaders(options: {
    headers?: Record<string, string>,
    method: 'PUT' | 'GET' | 'DELETE' | 'POST' | 'HEAD'
    bucket?: string
    object?: string
  }) {
    const date = (new Date).toUTCString()
    const headers: any = {
      Host: `${this.config.bucket}.${this.config.region}.aliyuncs.com`,
      Date: date,
      // 'Cache-Control': 'private',
      ...options.headers
    }
    const ossHeaders = Object.keys(options.headers || {}).filter(key => key.startsWith('x-oss-')).sort().map(k => `${k}:${options.headers?.[k]}`).join('\n')
    const sign = createHmac('sha1', this.config.accessKeySecret)
      .update(`${options.method}\n\n${options.headers?.['Content-Type'] ?? ''}\n${date}\n${ossHeaders ? ossHeaders + '\n' : ''}/${options.bucket ?? ''}${options.bucket ? `/` : ''}${options.object ?? ''}`)
      .digest().toString('base64')
    headers['Authorization'] = `OSS ${this.config.accessKeyId}:${sign}`
    return headers
  }
}
