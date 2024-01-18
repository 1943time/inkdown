import * as Electron from 'electron'
import {app, dialog} from 'electron'
import {removeFileRecord} from '../store/db'

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
  setWin(data: {openFolder?: string, openTabs?: string[], index?: number}) {
    ipcRenderer.send('set-win', data)
  },
  getServerConfig() {
    return ipcRenderer.invoke('getServerConfig')
  },
  saveServerConfig(config: any) {
    return ipcRenderer.invoke('saveServerConfig', config)
  },
  relaunch() {
    ipcRenderer.send('relaunch')
  },
  selectFolder() {
    return openDialog({
      properties: ['openDirectory']
    })
  },
  getMachineId():Promise<string> {
    return ipcRenderer.invoke('get-machine-id')
  },
  getPath(type: Parameters<typeof app.getPath>[0]) {
    return ipcRenderer.invoke('get-path', type)
  },
  showMessageBox(options: Parameters<typeof dialog['showMessageBoxSync']>[0]) {
    return ipcRenderer.invoke('message-dialog', options) as Promise<number>
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
  open(rootPath?: string) {
    return openDialog({
      title: 'Open File Or Folder',
      properties: ['openFile', 'openDirectory'],
      defaultPath: rootPath,
      filters: [{name: 'f', extensions: ['md', 'markdown']}]
    })
  },
  openTreeContextMenu(params: {
    type: 'rootFolder' | 'file' | 'folder'
    filePath?: string
  }) {
    ipcRenderer.send('tree-context-menu', params)
  },
  moveToTrash(path: string) {
    ipcRenderer.invoke('move-to-trash', path)
    removeFileRecord(path)
  },
  openToolMenu(filePath?: string) {
    ipcRenderer.send('tool-menu', filePath)
  },
  maxSize() {
    ipcRenderer.send('max-size')
  },
  getCachePath():Promise<string> {
    return ipcRenderer.invoke('getCachePath')
  },
  openInFolder(path: string) {
    ipcRenderer.send('openInFolder', path)
  },
  tableMenu(head = false) {
    ipcRenderer.send('table-menu', head)
  },
  mkdirp(path: string) {
    return ipcRenderer.invoke('mkdirp', path)
  },
  setEditorContext(ctx: string = '', isTop = true) {
    ipcRenderer.send('changeContext', ctx, isTop)
  }
}
