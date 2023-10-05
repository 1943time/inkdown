import {NodeSSH} from 'node-ssh'
import {join, sep} from 'path'
import {ipcRenderer} from 'electron'
import {toUnix} from 'upath'
const ssh = new NodeSSH()
import {readdirSync, readFileSync} from 'fs'
import {SFTPWrapper} from 'ssh2'
import {ScriptService} from './scriptService'
const unixJoin = (...args:string[]) => toUnix(join(...args))
export class Service {
  ssh: NodeSSH | null = null
  script: ScriptService
  constructor() {
    this.script = new ScriptService(this)
  }
  async getAssets() {
    const env = await ipcRenderer.invoke('get-env') as {webPath: string}
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
  close() {
    if (this.ssh) {
      this.ssh.dispose()
      this.ssh = null
    }
  }
  async getConfig() {
    return ipcRenderer.invoke('get-service-config') as Record<any, any>
  }
  private remoteExists(sftp: SFTPWrapper, filePath: string) {
    return new Promise((resolve, reject) => {
      sftp.exists(filePath, (res) => {
        resolve(res)
      })
    })
  }
  private async connectSsh(config: any) {
    this.ssh = await ssh.connect({
      host: config.host,
      username: config.username,
      password: config.password,
      port: config.port
    })
    return this.ssh
  }
  async initialSsh(config: any) {
    this.ssh = await ssh.connect({
      host: config.host,
      username: config.username,
      password: config.password,
      port: config.port
    })
    const assets = await this.getAssets()
    await this.ssh.withSFTP(async sftp => {
      const lib = unixJoin(config.target, 'lib')
      const exist = await this.remoteExists(sftp, lib)
      if (!exist) await this.ssh!.mkdir(lib)
    })
    await this.uploadFile('katex.min.css', assets.katex, 'lib')
    await this.uploadFile('favicon.png', assets.icon, 'lib')
    await this.uploadFile('style.css', assets.css, 'lib')
    await this.uploadFile('script.js', assets.script, 'lib')
    this.close()
  }
  private writeFileBySsh(sftp: SFTPWrapper, path: string, content: string) {
    return new Promise((resolve, reject) => {
      sftp.writeFile(path, content, res => {
        if (res instanceof Error) {
          reject(res)
        } else {
          resolve(null)
        }
      })
    })
  }
  async uploadDoc(data: {
    name: string, content: string, json: object, filePath: string
  }) {
    const config = await this.getConfig()
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh.withSFTP(async sftp => {
        const doc = unixJoin(config.target, 'doc')
        const exist = await this.remoteExists(sftp, doc)
        if (!exist) await this.ssh!.mkdir(doc)
        await this.writeFileBySsh(sftp, unixJoin(config.target, data.name), data.content)
      })
      this.close()
      return {name: data.name}
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
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh!.execCommand(`rm -f ${unixJoin(config.target, name)}`)
      this.close()
    } else {
      await this.script.instance?.removeFile({
        name,
        filePath
      })
    }
  }
  async uploadFile(name: string, filePath: string, dir = 'assets'): Promise<any> {
    const config = await this.getConfig()
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh.withSFTP(async sftp => {
        const assets = unixJoin(config.target, dir)
        const exist = await this.remoteExists(sftp, assets)
        if (!exist) await this.ssh!.mkdir(assets)
      })
      await this.ssh!.putFile(filePath, unixJoin(config.target, dir, name))
    }
  }
}
