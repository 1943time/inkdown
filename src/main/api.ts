import {
  dialog,
  ipcMain,
  Menu,
  BrowserWindow,
  shell,
  app,
  nativeTheme,
  BrowserView,
  systemPreferences,
  clipboard,
  nativeImage
} from 'electron'
import {mkdirp} from 'mkdirp'
import {is} from '@electron-toolkit/utils'
import {join} from 'path'
import {getLocale, store} from './store'
import {readFileSync, writeFileSync} from 'fs'
import {machineIdSync} from 'node-machine-id'
import icon from '../../resources/icon.png?asset'
export const baseUrl = is.dev && process.env['ELECTRON_RENDERER_URL'] ? process.env['ELECTRON_RENDERER_URL'] : join(__dirname, '../renderer/index.html')
const workerPath = join(__dirname, '../renderer/worker.html')
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions
export const windowOptions: BrowserWindowConstructorOptions = {
  show: false,
  // autoHideMenuBar: true,
  ...(process.platform === 'linux' ? {icon} : {}),
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
const isBoolean = (v: any) => typeof v === 'boolean'

export const registerApi = () => {
  store.delete('service-config')
  ipcMain.on('to-worker', (e, ...args:any[]) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    window?.getBrowserView()?.webContents.send('task', ...args)
  })

  ipcMain.handle('get-version', () => {
    return app.getVersion()
  })
  ipcMain.handle('get-machine-id', () => {
    return machineIdSync(true)
  })
  ipcMain.handle('get-path', (e, type: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(type)
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
      autoDownload: !!config.autoDownload,
      dark: dark,
      spellCheck: !!config.spellCheck,
      imagesFolder: config.imagesFolder || '.images',
      codeLineNumber: !!config.codeLineNumber,
      codeTabSize: config.codeTabSize || 4,
      codeTheme: config.codeTheme || 'material-theme-palenight',
      editorTextSize: config.editorTextSize || 16,
      leadingLevel: config.leadingLevel || 4,
      showCharactersCount: isBoolean(config.showCharactersCount) ? config.showCharactersCount : true,
      mas: process.mas || false,
      dragToSort: isBoolean(config.dragToSort) ? config.dragToSort : true,
      autoRebuild: isBoolean(config.autoRebuild) ? config.autoRebuild : true,
      locale: getLocale(),
      renameFileWhenSaving: !!config.renameFileWhenSaving,
      showFloatBar: isBoolean(config.showFloatBar) ? config.showFloatBar : true,
      showRemoveFileDialog: isBoolean(config.showRemoveFileDialog) ? config.showRemoveFileDialog : true
    }
  })

  ipcMain.on('relaunch', () => {
    app.relaunch()
    app.quit()
  })

  ipcMain.handle('get-system-dark', (e) => {
    return nativeTheme.shouldUseDarkColors
  })
  ipcMain.handle('set-service-config', (e, config: any) => {
    if (!config) store.delete('service-config')
    else store.set('service-config', config)
  })
  ipcMain.handle('get-service-config', e => {
    return store.get('service-config')
  })
  ipcMain.handle('copy-image', (e, path: string) => {
    return clipboard.writeImage(nativeImage.createFromPath(path))
  })
  ipcMain.on('setStore', (e, key: string, value: any) => {
    if (typeof value === 'undefined') {
      store.delete(key)
    } else {
      store.set(key, value)
      if (key === 'config.locale') {
        ipcMain.emit('set-locale', value)
      }
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
  ipcMain.handle('get-local', () => {
    return app.getLocale()
  })
  ipcMain.handle('save-dialog', async (e, options: Parameters<typeof dialog['showSaveDialog']>[0]) => {
    return dialog.showSaveDialog(options)
  })
  ipcMain.handle('message-dialog', async (e, options: Parameters<typeof dialog['showMessageBoxSync']>[0]) => {
    return dialog.showMessageBoxSync(options)
  })
  ipcMain.on('send-to-self', (e, task: string, ...args) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    window?.webContents.send(task, ...args)
  })

  ipcMain.on('send-to-all', (e, task: string, ...args) => {
    const windows = BrowserWindow.getAllWindows()
    for (let w of windows) {
      w.webContents?.send(task, ...args)
    }
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
