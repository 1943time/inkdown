import * as Electron from 'electron'
import {app, dialog} from 'electron'

const ipcRenderer = window.electron.ipcRenderer

let taskMap = new Map<string, Function>()

ipcRenderer.on('task-result', (e, id: string, result: any) => {
  taskMap.get(id)?.(result)
  taskMap.delete(id)
})
export const openDialog = (options: Parameters<typeof dialog['showOpenDialog']>[0]) => {
  return ipcRenderer.invoke('showOpenDialog', options) as Promise<Electron.OpenDialogReturnValue>
}

export const saveDialog = (options: Parameters<typeof dialog['showSaveDialog']>[0]) => {
  return ipcRenderer.invoke('save-dialog', options) as Promise<Electron.SaveDialogReturnValue>
}

export const MainApi = {
  closeWindow() {
    ipcRenderer.send('close-window')
  },
  getSystemDark() {
    return ipcRenderer.invoke('get-system-dark')
  },
  openDialog(options: Parameters<typeof dialog['showOpenDialog']>[0]) {
    return openDialog(options)
  },
  getServerConfig() {
    return ipcRenderer.invoke('getServerConfig')
  },
  saveServerConfig(config: any) {
    return ipcRenderer.invoke('saveServerConfig', config)
  },
  getMachineId():Promise<string> {
    return ipcRenderer.invoke('get-machine-id')
  },
  getPath(type: Parameters<typeof app.getPath>[0]) {
    return ipcRenderer.invoke('get-path', type)
  },
  getLocal() {
    return ipcRenderer.invoke('get-local') as Promise<string>
  },
  sendToSelf(task: string, ...args: any[]) {
    ipcRenderer.send('send-to-self', task, ...args)
  },
  sendToAll(task: string, ...args: any[]) {
    ipcRenderer.send('send-to-all', task, ...args)
  },
  saveDialog(options: Parameters<typeof dialog['showSaveDialog']>[0]) {
    return saveDialog(options)
  },
  createNewFile(options?: {
    defaultPath: string
  }) {
    return saveDialog({
      title: 'Create a Markdown file',
      properties: ['createDirectory'],
      securityScopedBookmarks: true,
      filters: [
        {name: 'markdown', extensions: ['md']}
      ],
      ...options
    })
  },
  openFile(data?: {
    ext?: string[],
    title?: string
    defaultFilePath?: string
  }) {
    return openDialog({
      title: data?.title || 'Open File',
      message: data?.title || 'Open File',
      properties: ['openFile'],
      defaultPath: data?.defaultFilePath,
      filters: [{name: 'f', extensions: data?.ext || ['md', 'markdown']}]
    })
  },
  openFolder(filePath?: string) {
    return openDialog({
      title: 'Open Folder',
      defaultPath: filePath,
      properties: ['openDirectory']
    })
  },
  moveToTrash(path: string) {
    ipcRenderer.invoke('move-to-trash', path)
  },
  errorLog(e: any, other: Record<string, any> = {}) {
    console.error(e, other)
    const message = e instanceof  Error ? e.message : e
    window.electron.ipcRenderer.send('error-log', {
      message, ...other
    })
  },
  maxSize() {
    ipcRenderer.send('max-size')
  },
  getCachePath():Promise<string> {
    return ipcRenderer.invoke('getCachePath')
  },
  showInFolder(path: string) {
    ipcRenderer.send('showInFolder', path)
  },
  mkdirp(path: string) {
    return ipcRenderer.invoke('mkdirp', path)
  }
}
