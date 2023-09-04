import {dialog, ipcMain, Menu, BrowserWindow, shell, app, nativeTheme, BrowserView, systemPreferences} from 'electron'
import {mkdirp} from 'mkdirp'
import {is} from '@electron-toolkit/utils'
import {join} from 'path'
import {store} from './store'
import {createReadStream, writeFileSync} from 'fs'
// import icon from '../../resources/icon.png?asset'
import FormData from "form-data"
export const baseUrl = is.dev && process.env['ELECTRON_RENDERER_URL'] ? process.env['ELECTRON_RENDERER_URL'] : join(__dirname, '../renderer/index.html')
const workerPath = join(__dirname, '../renderer/worker.html')
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions
import fetch from 'node-fetch'
import {openAuth} from './auth'

export const windowOptions: BrowserWindowConstructorOptions = {
  show: false,
  // autoHideMenuBar: true,
  // ...(process.platform === 'linux' ? {icon} : {}),
  minWidth: 700,
  minHeight: 400,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    nodeIntegration: true,
    contextIsolation: false
  }
}

export const isDark = (config?: any) => {
  if (!config) config = store.get('config') || {}
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
  return dark
}
export const registerApi = () => {
  ipcMain.on('to-worker', (e, ...args:any[]) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    window?.getBrowserView()?.webContents.send('task', ...args)
  })
  ipcMain.handle('get-version', () => {
    return app.getVersion()
  })
  ipcMain.handle('get-path', (e, type: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(type)
  })
  ipcMain.on('open-auth', (e, type: 'github') => {
    openAuth(type)
  })
  ipcMain.handle('get-env', () => {
    return {
      isPackaged: app.isPackaged,
      webPath: app.isPackaged ? join(app.getAppPath(), '..', 'web') : join(__dirname, '../../web')
    }
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
    const dark = isDark(config)
    return {
      showLeading: typeof config.showLeading === 'boolean' ? config.showLeading : true,
      theme: theme,
      dark: dark,
      codeLineNumber: !!config.codeLineNumber,
      codeTabSize: config.codeTabSize || 2,
      codeTheme: config.codeTheme || 'material-theme-palenight',
      editorTextSize: config.editorTextSize || 16,
      leadingLevel: config.leadingLevel || 4,
      showCharactersCount: typeof config.showCharactersCount === 'boolean' ? config.showCharactersCount : true,
      mas: process.mas || false,
      headingMarkLine: typeof config.headingMarkLine === 'boolean' ? config.headingMarkLine : true,
      token: config.token,
      dragToSort: typeof config.dragToSort === 'boolean' ? config.dragToSort : true
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
    if (typeof value === 'undefined') {
      store.delete(key)
    } else {
      store.set(key, value)
    }
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

  ipcMain.handle('move-to-trash', (e, path) => {
    return shell.trashItem(path)
  })

  ipcMain.handle('upload', (e, data: {
    url: string
    data: Record<string, string>
  }) => {
    const config:any = store.get('config') || {}
    const form = new FormData()
    for (let [key, v] of Object.entries(data.data)) {
      if (key === 'file') {
        form.append('file', createReadStream(v))
      } else {
        form.append(key, v)
      }
    }
    return fetch(data.url, {
      method: 'post', body: form,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    }).then(res => res.json())
  })

  ipcMain.on('print-pdf', async (e, filePath: string, rootPath?: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      const view = new BrowserView({
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false,
          nodeIntegration: true,
          contextIsolation: false
        }
      })
      win.setBrowserView(view)
      view.setBounds({ x: 0, y: 0, width: 0, height: 0})
      ipcMain.handleOnce('print-dom-ready', () => {
        return filePath
      })
      await view.webContents.loadFile(workerPath)
      const ready = async (e: any, filePath: string) => {
        try {
          const save = await dialog.showSaveDialog({
            filters: [{name: 'pdf', extensions: ['pdf']}]
          })
          if (save.filePath) {
            const buffer = await view.webContents.printToPDF({
              printBackground: true,
              displayHeaderFooter: true,
              margins: {
                marginType: 'custom',
                bottom: 0,
                left: 0,
                top: 0,
                right: 0
              },
            })
            writeFileSync(save.filePath, buffer)
            shell.showItemInFolder(save.filePath)
          }
        } finally {
          win.setBrowserView(null)
        }
      }
      ipcMain.once('print-pdf-ready', ready)
    }
  })
}
