import {NodeSSH} from 'node-ssh'
import {join, sep} from 'path'
import {ipcRenderer} from 'electron'
const ssh = new NodeSSH()
import {readdirSync, readFileSync} from 'fs'
import {SFTPWrapper} from 'ssh2'
export class Service {
  ssh: NodeSSH | null = null
  private async getAssets() {
    const env = await ipcRenderer.invoke('get-env') as {webPath: string}
    const files = readdirSync(env.webPath)
    const scriptPath = files.find(f => f.endsWith('.js'))
    const cssPath = files.find(f => f === 'style.css')
    return {
      script: await readFileSync(join(env.webPath, scriptPath!), {encoding:'utf-8'}),
      icon: join(env.webPath, 'favicon.png'),
      katex: join(env.webPath, 'katex.min.css'),
      css: await readFileSync(join(env.webPath, cssPath!), {encoding:'utf-8'})
    }
  }
  close() {
    if (this.ssh) {
      this.ssh.dispose()
      this.ssh = null
    }
  }
  private async getConfig() {
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
      const lib = join(config.target, 'lib')
      const exist = await this.remoteExists(sftp, lib)
      if (!exist) await this.ssh!.mkdir(lib)
      await this.writeFileBySsh(sftp, join(lib, 'style.css'), assets.css)
      await this.writeFileBySsh(sftp, join(lib, 'script.js'), assets.script)
    })
    await this.uploadFile('katex.min.css', assets.katex, 'lib')
    await this.uploadFile('favicon.png', assets.icon, 'lib')
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
  async uploadDoc(name: string, content: string) {
    const config = await this.getConfig()
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh.withSFTP(async sftp => {
        const doc = join(config.target, 'doc')
        const exist = await this.remoteExists(sftp, doc)
        if (!exist) await this.ssh!.mkdir(doc)
        await this.writeFileBySsh(sftp, join(config.target, name), content)
      })
      this.close()
    }
  }
  async deleteDoc(path: string) {
    const config = await this.getConfig()
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh!.execCommand(`rm -f ${join(config.target, path)}`)
    }
    this.close()
  }
  async uploadFile(name: string, filePath: string, dir = 'assets'): Promise<any> {
    const config = await this.getConfig()
    if (config.type === 'ssh') {
      if (!this.ssh) this.ssh = await this.connectSsh(config)
      await this.ssh.withSFTP(async sftp => {
        const assets = join(config.target, dir)
        const exist = await this.remoteExists(sftp, assets)
        if (!exist) await this.ssh!.mkdir(assets)
      })
      await this.ssh!.putFile(filePath, join(config.target, dir, name))
    } else {

    }
  }
}
