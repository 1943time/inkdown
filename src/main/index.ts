import {app, BrowserWindow, dialog, ipcMain, screen, shell, globalShortcut} from 'electron'
import {lstatSync} from 'fs'
import {electronApp, is, optimizer} from '@electron-toolkit/utils'
import {baseUrl, isDark, registerApi, windowOptions} from './api'
import {createAppMenus} from './appMenus'
import {registerMenus} from './menus'
import {store} from './store'
import {AppUpdate} from './update'
const isWindows = process.platform === 'win32'

type WinOptions = {
  openFolder?: string
  openTabs?: string[]
  index?: number
}
const windows = new Map<number, WinOptions>()
app.setAsDefaultProtocolClient('bluestone-markdown')
let fileChangedWindow: BrowserWindow | null = null
function createWindow(initial?: WinOptions): void {
  const dark = isDark()
  const {width, height} = screen.getPrimaryDisplay().workAreaSize
  const window = new BrowserWindow({
    width,
    height,
    titleBarStyle: 'hiddenInset',
    backgroundColor: dark ? '#222222' : '#ffffff',
    ...windowOptions
  })
  window.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({requestHeaders: {Origin: '*', ...details.requestHeaders}})
    },
  )
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        'Access-Control-Allow-Origin': ['*'],
        ...details.responseHeaders,
      },
    })
  })
  window.on('enter-full-screen', () => {
    window.webContents?.send('enter-full-screen')
  })

  window.on('leave-full-screen', () => {
    window.webContents?.send('leave-full-screen')
  })

  window.on('ready-to-show', () => {
    is.dev && window.webContents.openDevTools()
  })
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return {action: 'deny'}
  })
  window.on('focus', () => {
    window.webContents.send('window-focus')
  })
  is.dev ? window.loadURL(baseUrl) : window.loadFile(baseUrl)
  window.on('blur', e => {
    window.webContents.send('window-blur')
  })
  window.on('close', (e) => {
    if (fileChangedWindow === window) {
      const res = dialog.showMessageBoxSync(window, {
        type: 'info',
        message: 'The file has not been saved yet. Do you want to close the window now?',
        buttons: ['Cancel', 'Ok']
      })
      if (res !== 1) {
        e.preventDefault()
        return
      }
    }
    const id = window.id
    setTimeout(() => {
      windows.delete(id)
    }, 500)
  })
  windows.set(window.id, initial || {})
  window.show()
}

let waitOpenFile = ''
app.on('will-finish-launching', () => {
  // Event fired When someone drags files onto the icon while your app is running
  app.on("open-file", (event, file) => {
    event.preventDefault()
    if (app.isReady() === false) {
      waitOpenFile = file
    } else {
      openFiles(file)
    }
  })
  app.on('open-url', (event, url) => {
    BrowserWindow.getFocusedWindow()?.webContents.send('open-schema', url)
  })
})
ipcMain.on('open-history-path', (e, path: string) => {
  openFiles(path)
})
const openFiles = (filePath: string) => {
  try {
    const win = Array.from(windows).find(w => {
      return (w[1].openTabs?.includes(filePath) || w[1]?.openFolder === filePath) || (w[1].openFolder && filePath.startsWith(w[1].openFolder))
    })
    if (win) {
      if (win[1].openTabs?.includes(filePath) || win[1]?.openFolder === filePath) {
        BrowserWindow.fromId(win[0])?.focus()
      } else if (win[1].openFolder && filePath.startsWith(win[1].openFolder)) {
        const w = BrowserWindow.fromId(win[0])
        w?.focus()
        if (lstatSync(filePath).isFile()) w?.webContents.send('open-path', filePath)
      }
    } else {
      const stat = lstatSync(filePath)
      createWindow({
        openFolder: stat.isDirectory() ? filePath : undefined,
        openTabs: stat.isFile() ? [filePath] : undefined
      })
    }
  } catch (e) {
  }
}

app.on('browser-window-focus', () => {
  globalShortcut.register("CommandOrControl+W", () => {
    BrowserWindow.getFocusedWindow()?.webContents.send('close-current-tab')
  })
})

app.on('browser-window-blur', () => {
  globalShortcut.unregister('CommandOrControl+W')
})
app.whenReady().then(() => {
  createAppMenus()
  registerMenus()
  registerApi()
  new AppUpdate()
  ipcMain.on('create-window', (e, filePath?: string) => {
    if (filePath) {
      openFiles(filePath)
    } else {
      createWindow()
    }
  })

  ipcMain.on('set-win', (e, data: WinOptions) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    if (!windows.get(window.id)) return
    if (data.openFolder) windows.get(window.id)!.openFolder = data.openFolder
    if (data.openTabs) windows.get(window.id)!.openTabs = data.openTabs
    if (typeof data.index !== 'undefined') windows.get(window.id)!.index = data.index
    console.log('set', data)
  })
  ipcMain.on('add-recent-path', (e, path) => {
    store.set('recent-open-paths', Array.from(new Set([...(store.get('recent-open-paths') as any[] || []), path])))
    app.addRecentDocument(path)
    ipcMain.emit('refresh-recent')
  })

  ipcMain.on('file-changed', (e) => {
    fileChangedWindow = BrowserWindow.fromWebContents(e.sender)
  })

  ipcMain.on('file-saved', () => {
    fileChangedWindow = null
  })

  ipcMain.handle('get-win-set', (e) => {
    const window = BrowserWindow.fromWebContents(e.sender)!
    const w = windows.get(window.id)
    if (w) {
      return {
        openFolder: w.openFolder,
        index: w.index,
        openTabs: w.openTabs
      }
    }
    return null
  })
  app.on('before-quit', e => {
    store.set('windows', Array.from(windows).map(w => w[1]))
  })
  if (isWindows) electronApp.setAppUserModelId('me.bluemd')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  if (isWindows) waitOpenFile = process.argv[1] || ''
  if (waitOpenFile === '.') waitOpenFile = ''
  try {
    const data = store.get('windows') as WinOptions[] || []
    if (data?.length) {
      for (let d of data) {
        createWindow(typeof d === 'object' ? d : undefined)
      }
    } else if (!waitOpenFile) {
      createWindow()
    }
  } catch (e) {
    // log.error('create error', e)
  }
  if (waitOpenFile) {
    const win = Array.from(windows).find(w => {
      return !w[1].openFolder
    })
    if (win) {
      setTimeout(() => {
        BrowserWindow.fromId(win[0])?.webContents.send('open-path', waitOpenFile)
      }, 300)
    } else{
      createWindow({
        openTabs: [waitOpenFile]
      })
    }
    waitOpenFile = ''
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
