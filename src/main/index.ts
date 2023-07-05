import {app, BrowserWindow, shell, BrowserView, systemPreferences, ipcMain} from 'electron'
import {join} from 'path'
import {is, optimizer} from '@electron-toolkit/utils'
import log from 'electron-log'
import icon from '../../resources/icon.png?asset'
import {baseUrl, registerApi} from './api'
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions
import {createAppMenus} from './appMenus'
import {registerMenus} from './menus'
import {store} from './store'
import {AppUpdate} from './update'
type WinOptions = {
  width?: number
  height?: number
  x?: number
  y?: number
  openFolder?: string
  openFile?: string
}
const options:BrowserWindowConstructorOptions =  {
  show: false,
  autoHideMenuBar: true,
  ...(process.platform === 'linux' ? { icon } : {}),
  minWidth: 700,
  minHeight: 400,
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    nodeIntegration: true,
    contextIsolation: false,
    webviewTag: true
  }
}
const windows = new Map<number, WinOptions>()
function createWindow(initial?: WinOptions): void {
  const window = new BrowserWindow({
    width: initial?.width || 1000,
    height: initial?.height || 800,
    titleBarStyle: 'hiddenInset',
    ...options
  })
  window.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } });
    },
  );

  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        'Access-Control-Allow-Origin': ['*'],
        ...details.responseHeaders,
      },
    });
  });
  window.on('ready-to-show', () => {
    is.dev && window.webContents.openDevTools()
    window.show()
  })
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  window.on('focus', () => {
    window.webContents.send('window-focus')
  })
  is.dev ? window.loadURL(baseUrl) : window.loadFile(baseUrl)
  window.on('blur', e => {
    window.webContents.send('window-blur')
  })
  windows.set(window.id, initial || {})
}

app.whenReady().then(() => {
  createAppMenus()
  registerMenus()
  registerApi()
  new AppUpdate()
  ipcMain.on('create-window', () => createWindow())
  // console.log(app.getPath('userData'))
  app.commandLine.appendSwitch('lang', 'zh-CN')
  ipcMain.on('set-win', (e, data: WinOptions) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    if (!windows.get(window.id)) return
    if (data.openFolder) windows.get(window.id)!.openFolder = data.openFolder
    if (data.openFile) windows.get(window.id)!.openFile = data.openFile
  })
  ipcMain.handle('get-win-set', (e) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    const w = windows.get(window.id)
    if (w) {
      return {
        openFolder: w.openFolder,
        openFile: w.openFile
      }
    }
    return null
  })
  app.on('before-quit', e => {
    store.set('windows', BrowserWindow.getAllWindows().map(w => {
      const bound = w.getBounds()
      return {
        ...windows.get(w.id),
        width: bound.width,
        height: bound.height,
        x: bound.x,
        y: bound.y,
      }
    }))
  })
  // Set app user model id for windows
  // electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  try {
    const data = store.get('windows') as WinOptions[] || []
    console.log('data', data)
    if (data?.length) {
      for (let d of data) {
        createWindow(typeof d === 'object' ? d : undefined)
      }
    } else {
      createWindow()
    }
  } catch (e) {
    log.error('create error', e)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
