import {ipcRenderer} from 'electron'
import {AliApi} from './ali'
import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'
import {SshApi} from './ssh'
export abstract class ServerSdk {
  abstract connect(): Promise<any>
  abstract getSdk?(): Promise<any>
  abstract initial(files?: {name: string, filePath: string, contentType: string}[]): Promise<any>
  abstract reset(files?: {name: string, filePath: string, contentType: string}[]): Promise<any>
  abstract syncDoc(name: string, content: string, title: string): Promise<any>
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

  async syncDoc(name: string, content: string, title: string, mode:'doc' | 'book' = 'doc') {
    let temp = readFileSync(join(__dirname, '../../resources/lib/temp.html'), {encoding: 'utf-8'})
    temp = temp.replace('__style__', `<link href="/lib/style.css" rel="stylesheet">`)
      .replace('__script__', `<script src="/lib/main.js"></script>`)
      .replace('__content__', content)
      .replace(/__name__/g, title)
      .replace(/__mode__/, mode)
    await this.getSdk()
    return this.targetSdk.syncDoc(name, temp, title)
  }
  async uploadFileByText(name, content) {
    await this.getSdk()
    return this.targetSdk.uploadFileByText(name, content)
  }
  async reset() {
    await this.getSdk()
    const sourcePath = join(__dirname, '../../resources/lib')
    return this.targetSdk.reset([
      {name: 'lib/style.css', filePath: join(sourcePath, 'style.css'), contentType: 'text/css'},
      {name: 'lib/main.js', filePath: join(sourcePath, 'main.js'), contentType: 'application/javascript'}
    ])
  }
  async initial() {
    await this.getSdk()
    const shikiPath = join(__dirname, '../../node_modules/shiki')
    const sourcePath = join(__dirname, '../../resources/lib')
    const languages = readdirSync(join(shikiPath, 'languages'))
    const themes = readdirSync(join(shikiPath, 'themes'))
    const files:{name: string, filePath: string, contentType: string}[] = [
      {name: 'lib/style.css', filePath: join(sourcePath, 'style.css'), contentType: 'text/css'},
      {name: 'lib/main.js', filePath: join(sourcePath, 'main.js'), contentType: 'application/javascript'},
      {name: 'lib/mermaid.js', filePath: join(sourcePath, 'mermaid.js'), contentType: 'application/javascript'},
      {name: 'lib/shiki/dist/onig.wasm', filePath: join(shikiPath, 'dist/onig.wasm'), contentType: 'application/wasm'},
    ]
    files.push(...languages.map(l => {
      return {name: `lib/shiki/languages/${l}`, filePath: join(shikiPath, `languages/${l}`), contentType: 'application/json'}
    }))
    files.push(...themes.map(l => {
      return {name: `lib/shiki/themes/${l}`, filePath: join(shikiPath, `themes/${l}`), contentType: 'application/json'}
    }))
    return this.targetSdk.initial(files)
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
