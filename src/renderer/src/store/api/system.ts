import {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue
} from 'electron'

const ipcRenderer = window.electron.ipcRenderer
export class SystemApi {
  async showOpenDialog(options: OpenDialogOptions) {
    return ipcRenderer.invoke('showOpenDialog', options) as Promise<OpenDialogReturnValue>
  }
  async showSaveDialog(options: SaveDialogOptions) {
    return ipcRenderer.invoke('showSaveDialog', options) as Promise<SaveDialogReturnValue>
  }
  async writeFile(from: string, name: string) {
    const path = await ipcRenderer.invoke('getAssetsPath')
    await window.api.fs.cp(from, window.api.path.join(path, name))
  }
  async getAssetsPath(): Promise<string> {
    return ipcRenderer.invoke('getAssetsPath')
  }
  async writeFileBuffer(buffer: ArrayBuffer, name: string) {
    const path = await ipcRenderer.invoke('getAssetsPath')
    await window.api.fs.writeBuffer(window.api.path.join(path, name), buffer)
  }
  async getFilePath(name: string): Promise<string> {
    return ipcRenderer.invoke('getFilePath', name)
  }
  async userDataPath(): Promise<string> {
    return ipcRenderer.invoke('userDataPath')
  }
}
