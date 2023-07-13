import {NodeSSH} from 'node-ssh'
import {ServerSdk} from './index'
import {join, sep} from 'path'
import {SFTPWrapper} from 'ssh2'

const ssh = new NodeSSH()

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

  async connect() {
    this.ssh = await ssh.connect({
      host: this.config.host,
      username: this.config.username,
      password: this.config.password,
      port: this.config.port
    })
    return this.ssh
  }

  async uploadFile(name: string, filePath: string, contentType?: string): Promise<any> {
    if (!this.ssh) this.ssh = await this.connect()
    await this.ssh!.putFile(filePath, join(this.config.target, name))
  }
  async removeFile(name: string): Promise<any> {
    if (!this.ssh) this.ssh = await this.connect()
    await this.ssh!.execCommand(`rm -rf ${join(this.config.target, name)}`)
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
}
