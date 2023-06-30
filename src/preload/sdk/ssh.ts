import {NodeSSH} from 'node-ssh'
import {ServerSdk} from './index'
import {join, parse, sep} from 'path'
import {writeFileSync} from 'fs'
import {SFTPWrapper} from 'ssh2'
const ssh = new NodeSSH()
const config = {
  host: '47.243.113.100',
  username: 'root',
  password: 'Best1151',
  target: '/opt/blog/.next'
}

export const ssh_test = () => {
  ssh.connect({
    host: config.host,
    username: config.username,
    password: config.password
  }).then(res => {
    console.log('connected')
  })
}

interface Config {
  host: string
  username: string
  password: string
  target: string
  domain: string
  port?: number
}
export class SshApi implements ServerSdk {
  ssh: NodeSSH | null = null
  constructor(
    private readonly config: Config
  ) {}
  reset(): Promise<any> {
    return Promise.resolve(undefined)
  }
  async connect() {
    return await ssh.connect({
      host: this.config.host,
      username: this.config.username,
      password: this.config.password,
      port: this.config.port
    })
  }

  async uploadFile(name: string, filePath: string, contentType?: string): Promise<any> {
    if (!this.ssh) this.ssh = await this.connect()
    await this.ssh!.putFile(filePath, join(this.config.target, name))
  }
  async removeFile(name: string): Promise<any> {
    if (!this.ssh) this.ssh = await this.connect()
    await this.ssh!.execCommand(`rm -rf ${join(this.config.target, name)}`)
  }
  async initial(files?: { name: string; filePath: string; contentType: string }[]): Promise<any> {
    if (!this.ssh) this.ssh = await this.connect()
    await this.ssh!.putFiles(files!.map(f => {
      return {local: f.filePath, remote: join(this.config.target, f.name)}
    }))
  }
  dispose() {
    if (this.ssh) {
      this.ssh.dispose()
      this.ssh = null
    }
  }
  private remoteExists(sftp: SFTPWrapper, filePath: string) {
    return new Promise((resolve, reject) => {
      sftp.exists(filePath, (res) => {
        resolve(res)
      })
    })
  }
  async uploadFileByText(name, content) {
    if (!this.ssh) this.ssh = await this.connect()
    const dir = name.split(sep).slice(0, -1).join(sep)
    return this.ssh.withSFTP(async sftp => {
      return new Promise(async (resolve, reject) => {
        const exist = await this.remoteExists(sftp, join(this.config.target, dir))
        if (!exist) await this.ssh!.mkdir(join(this.config.target, dir))
        sftp.writeFile(join(this.config.target, name), content, res => {
          if (res instanceof Error) {
            reject(res)
          } else {
            resolve()
          }
        })
      })
    })
  }
  async syncDoc(name: string, content: string, title: string): Promise<any> {
    if (!this.ssh) {this.ssh = await this.connect()}
    const sourcePath = join(__dirname, '../../resources/lib')
    const current = join(sourcePath, 'current.html')
    writeFileSync(current, content, {encoding: 'utf-8'})
    await this.ssh!.putFile(current, join(this.config.target, name))
  }
}
