import { IpcCore } from './core'

export class Ipc {
  private core = new IpcCore()
  constructor() {
    this.getSettings()
  }
  getSettings() {
    this.core.invoke('getSettings').then((res) => {
      console.log('res', res)
    })
  }
  maxWindow() {
    this.core.invoke('maxWindow')
  }
}
