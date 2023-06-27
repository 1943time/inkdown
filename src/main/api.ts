import {dialog, ipcMain, Menu, BrowserWindow, shell, app, nativeTheme} from 'electron'
import {mkdirp} from 'mkdirp'
import {is} from '@electron-toolkit/utils'
import {join} from 'path'
import {store} from './store'
export const baseUrl = is.dev && process.env['ELECTRON_RENDERER_URL'] ? process.env['ELECTRON_RENDERER_URL'] : join(__dirname, '../renderer/index.html')
export const registerApi = () => {
  ipcMain.on('to-worker', (e, ...args:any[]) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    window?.getBrowserView()?.webContents.send('task', ...args)
  })
  ipcMain.handle('saveServerConfig', (e, config: any) => {
    store.set('server-config', config)
  })
  ipcMain.handle('removeServerConfig', (e) => {
    store.delete('server-config')
  })
  ipcMain.handle('getServerConfig', (e) => {
    return store.get('server-config')
  })
  ipcMain.handle('getConfig', () => {
    const config:any = store.get('config') || {}
    const theme = typeof config.theme === 'string' ? config.theme : nativeTheme.themeSource
    let dark = false
    if (typeof config.theme === 'string') {
      if (config.theme === 'dark') {
        dark = true
      } else if (config.theme === 'system' && nativeTheme.shouldUseDarkColors) {
        dark = true
      }
    } else {
      dark = nativeTheme.shouldUseDarkColors
    }
    return {
      showLeading: !!config.showLeading,
      theme: theme,
      dark: dark,
      codeLineNumber: !!config.codeLineNumber,
      codeTabSize: config.codeTabSize || 2,
      codeTheme: config.codeTheme || 'material-theme-palenight',
      editorTextSize: config.editorTextSize || 16,
      leadingLevel: config.leadingLevel || 4
    }
  })

  ipcMain.on('relaunch', () => {
    app.relaunch()
    app.quit()
  })

  ipcMain.handle('get-system-dark', (e) => {
    return nativeTheme.shouldUseDarkColors
  })
  ipcMain.on('setStore', (e, key: string, value: any) => {
    store.set(key, value)
  })
  ipcMain.on('toggleShowLeading', (e, show: boolean) => {
    const showLeading = Menu.getApplicationMenu()?.getMenuItemById('showLeading')
    if (showLeading) showLeading.click()
    return showLeading?.checked || false
  })
  ipcMain.handle('mkdirp', (e, path: string) => {
    return mkdirp(path)
  })
  ipcMain.handle('save-dialog', async (e, options: Parameters<typeof dialog['showSaveDialog']>[0]) => {
    return dialog.showSaveDialog(options)
  })
  ipcMain.on('send-to-self', (e, task: string, ...args) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    window?.webContents.send(task, ...args)
  })

  ipcMain.on('close-window', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })

  ipcMain.on('task-result', (e, ...args) => {
    BrowserWindow.fromWebContents(e.sender)?.webContents.send('task-result', ...args)
  })
  ipcMain.handle('getCachePath', async (e) => {
    return app.getPath('sessionData')
  })
  ipcMain.handle('showOpenDialog', async (e, options: Parameters<typeof dialog['showOpenDialog']>[0]) => {
    return dialog.showOpenDialog({
      ...options,
      securityScopedBookmarks: true
    })
  })
  ipcMain.on('openInFolder', (e, path: string) => {
    shell.showItemInFolder(path)
  })
  ipcMain.on('max-size', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.maximize()
  })

  ipcMain.on('move-to-trash', (e, path) => {
    return shell.trashItem(path)
  })
  ipcMain.handle('get-base-url', e => {
    return baseUrl
  })
  ipcMain.handle('get-preload-url', e => {
    return join(__dirname, '../preload/index.js')
  })
}
