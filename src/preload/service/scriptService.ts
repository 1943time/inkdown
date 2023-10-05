import {ipcRenderer} from 'electron'
import {join} from 'path'
import {readFileSync, writeFileSync} from 'fs'
import {Service} from './service'
import got from 'got'
import mimeTypes from 'mime-types'

interface Instance {
  uploadDoc(ctx: {
    json: object
    randomName: string
    filePath: string
    htmlBuffer: Buffer
  }): Promise<{name: string}>

  removeFile(ctx: {name: string, filePath: string}): Promise<{success: true}>
}
export class ScriptService {
  instance: null | Instance = null
  constructor(
    readonly service: Service
  ) {
    this.initial()
  }
  initial() {
    this.service.getConfig().then(async res => {
      if (res?.type === 'custom') {
        const path = await this.getScriptPath()
        delete require.cache[require.resolve(path)]
        const script = require(path)
        this.instance = new script.Service({
          got, mimeTypes
        })
      }
    })
  }
  private async getScriptPath() {
    const dataPath = await ipcRenderer.invoke('get-path', 'userData') as string
    return join(dataPath, 'bsService.js')
  }
  async saveScript(script: string, domain: string) {
    const path = await this.getScriptPath()
    writeFileSync(path, script)
    await this.test(path, domain)
  }
  async test(path: string, domain: string) {
    delete require.cache[require.resolve(path)]
    const script = require(path)
    if (!script?.Service) throw new Error('Please export the Service instance in the script')
    const service = new script.Service({
      got, mimeTypes
    })
    if (!service.uploadDependencyLibrary) throw new Error('Please implement the uploadDependencyLibrary method')
    if (!service.uploadDoc) throw new Error('Please implement the uploadDoc method')
    if (!service.removeFile) throw new Error('Please implement the removeFile method')
    const assets = await this.service.getAssets()
    await service.uploadDependencyLibrary('lib/script.js', readFileSync(assets.script))
    await service.uploadDependencyLibrary('lib/favicon.png', readFileSync(assets.script))
    await service.uploadDependencyLibrary('lib/style.css', readFileSync(assets.css))
    await service.uploadDependencyLibrary('lib/katex.min.css', readFileSync(assets.katex))
    const res = await service.uploadDoc({
      json: [{text: ' '}],
      randomName: 'doc/test.html',
      filePath: 'user/test.md',
      htmlBuffer: Buffer.from(' ', 'utf-8')
    })
    if (!res?.name) throw new Error('the method uploadDoc must return the format {name: string}')
    await got.get(domain + '/' + 'doc/test.html').catch(e => {
      throw new Error(`url ${domain}/doc/text.html is not accessible`)
    })
    await service.removeFile({
      name: 'doc/test.html',
      filePath: 'user/test.md'
    })
    await got.get(domain + '/' + 'doc/test.html').then(e => {
      throw new Error(`invalid`)
    }).catch((e: any) => {
      if (e.message === 'invalid') throw new Error('Invalid deletion of doc/text.html, please check the removeFile method')
      return null
    })
  }
}
