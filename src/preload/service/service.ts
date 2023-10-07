import {join, sep} from 'path'
import {ipcRenderer} from 'electron'
import {toUnix} from 'upath'
import {readdirSync, readFileSync} from 'fs'
import {ScriptService} from './scriptService'
import got, {Got} from 'got'
import {createHmac} from 'crypto'

const unixJoin = (...args: string[]) => toUnix(join(...args))

export class Service {
  script: ScriptService
  request!: Got

  constructor() {
    this.script = new ScriptService(this)
    ipcRenderer.invoke('get-service-config').then(res => {
      if (res?.type === 'server') {
        this.request = this.createRequest(res)
      }
    })
  }

  createRequest(config: any) {
    return got.extend({
      prefixUrl: config.domain,
      responseType: 'json',
      hooks: {
        beforeRequest: [req => {
          const date = Date.now()
          const sign = createHmac('sha1', config.secret).update(date.toString(16)).digest('hex')
          req.headers.date = String(date)
          req.headers.authorization = sign
        }],
        afterResponse: [async response => {
          // @ts-ignore
          if (response.body?.message) throw new Error(response.body?.message)
          return response
        }]
      }
    })
  }

  async getAssets() {
    const env = await ipcRenderer.invoke('get-env') as { webPath: string }
    const files = readdirSync(env.webPath)
    const scriptPath = files.find(f => f.endsWith('.js'))
    const cssPath = files.find(f => f === 'style.css')
    return {
      script: unixJoin(env.webPath, scriptPath!),
      icon: unixJoin(env.webPath, 'favicon.png'),
      katex: unixJoin(env.webPath, 'katex.min.css'),
      css: unixJoin(env.webPath, cssPath!)
    }
  }

  async getConfig() {
    return ipcRenderer.invoke('get-service-config') as Record<any, any>
  }

  async initial(config: any) {
    this.request = this.createRequest(config)
    await this.request('connect', {timeout: 1000}).json()
    const assets = await this.getAssets()
    await this.request.post('uploadLib', {
      json: {name: 'script.js', content: readFileSync(assets.script, {encoding: 'utf-8'})}
    })
    await this.request.post('uploadLib', {
      json: {name: 'style.css', content: readFileSync(assets.css, {encoding: 'utf-8'})}
    })
    await this.request.post('uploadLib', {
      json: {name: 'katex.min.css', content: readFileSync(assets.katex, {encoding: 'utf-8'})}
    })
    await this.request.post('uploadLib', {
      json: {name: 'favicon.png', content: readFileSync(assets.icon, {encoding: 'base64'})}
    })
  }

  async uploadDoc(data: {
    name: string,
    content: string,
    filePath: string,
    json: object
  }) {
    const config = await this.getConfig()
    if (config.type === 'server') {
      return this.request.post('uploadDoc', {
        json: {name: data.name, htmlContent: data.content}
      })
    } else {
      return this.script.instance?.uploadDoc({
        filePath: data.filePath,
        json: data.json,
        randomName: data.name,
        htmlBuffer: Buffer.from(data.content, 'utf-8')
      })
    }
  }

  async deleteDoc(name: string, filePath: string) {
    const config = await this.getConfig()
    if (config.type === 'server') {
      return this.request.post('removeDoc', {
        json: {name}
      }).json()
    } else {
      return this.script.instance?.removeFile({
        name,
        filePath
      })
    }
  }
}
