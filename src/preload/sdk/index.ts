import {ipcRenderer, app} from 'electron'
import {AliApi} from './ali'
import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'
import {SshApi} from './ssh'
import {of} from 'rxjs'
export abstract class ServerSdk {
  abstract connect(): Promise<any>
  abstract getSdk?(): Promise<any>
  abstract uploadFile(name: string, filePath: string, contentType?: string): Promise<any>
  abstract removeFile(name: string): Promise<any>
  abstract dispose?(): any
  abstract uploadFileByText(name: string, content: string): Promise<any>
}
export class Sdk implements  ServerSdk {
  targetSdk!: ServerSdk
  private async getConfig() {
    return ipcRenderer.invoke('getServerConfig')
  }
  private async uploadMultiple(files: {name: string, filePath: string, contentType?: string}[]) {
    let offset = 0
    let stack = files.slice(offset, offset + 5)
    while (stack.length) {
      await Promise.all(stack.map(f => this.uploadFile(f.name, f.filePath, f.contentType)))
      offset += 5
      stack = files.slice(offset, offset + 5)
    }
  }
  async getSdk() {
    if (this.targetSdk) return
    const config = await this.getConfig()
    switch (config.server) {
      case 'ali':
        this.targetSdk = new AliApi(config)
        break
      case 'ssh':
        this.targetSdk =  new SshApi(config)
        break
    }
  }
  async connect(): Promise<any> {
    await this.getSdk()
    return this.targetSdk.connect()
  }

  async uploadFileByText(name, content) {
    await this.getSdk()
    return this.targetSdk.uploadFileByText(name, content)
  }
  async getWebPath():Promise<{webPath: string, isPackaged: boolean}> {
    return ipcRenderer.invoke('get-env')
  }
  async reset() {
    await this.getSdk()
    const env = await this.getWebPath()
    const filesName = readdirSync(join(env.webPath, 'lib'))
    const files:{name: string, filePath: string, contentType?: string}[] = [
      {name: 'index.html', filePath: join(env.webPath, 'index.html')}
    ]
    files.push(...filesName.map(n => {
      return {name: `lib/${n}`, filePath: join(env.webPath, 'lib', n)}
    }))

    await this.uploadMultiple(files)
    this.targetSdk.dispose?.()
  }
  async initial() {
    await this.getSdk()
    const env = await this.getWebPath()
    const shikiPath = env.isPackaged ? join(env.webPath, 'shiki') : join(env.webPath, '../node_modules/shiki')
    const languages = readdirSync(join(shikiPath, 'languages'))
    const themes = readdirSync(join(shikiPath, 'themes'))
    const filesName = readdirSync(join(env.webPath, 'lib'))
    const files:{name: string, filePath: string, contentType?: string}[] = [
      {name: 'index.html', filePath: join(env.webPath, 'index.html')},
      {name: 'icon.png', filePath: join(env.webPath, 'icon.png')},
      {name: 'lib/shiki/onig.wasm', filePath: join(shikiPath, 'dist/onig.wasm'), contentType: 'application/wasm'},
    ]

    files.push(...filesName.map(n => {
      return {name: `lib/${n}`, filePath: join(env.webPath, 'lib', n)}
    }))

    files.push(...languages.map(l => {
      return {name: `lib/shiki/languages/${l}`, filePath: join(shikiPath, `languages/${l}`), contentType: 'application/json'}
    }))
    files.push(...themes.map(l => {
      return {name: `lib/shiki/themes/${l}`, filePath: join(shikiPath, `themes/${l}`), contentType: 'application/json'}
    }))
    await this.uploadMultiple(files)
    this.targetSdk.dispose?.()
  }
  async uploadFile(name, filePath, contentType?) {
    await this.getSdk()
    return this.targetSdk.uploadFile(name, filePath, contentType)
  }

  dispose() {
    if (this.targetSdk) this.targetSdk.dispose?.()
  }

  async removeFile(name: string): Promise<any> {
    await this.getSdk()
    return this.targetSdk.removeFile(name)
  }
}
