import {app, BrowserWindow, dialog, globalShortcut, ipcMain, nativeTheme, screen, shell, Menu, MenuItem} from 'electron'
import {electronApp, is, optimizer} from '@electron-toolkit/utils'
import {baseUrl, registerApi, windowOptions} from './api'
import {createAppMenus} from './appMenus'
import {AppUpdate} from './update'
import {isAbsolute, join} from 'path'
const isWindows = process.platform === 'win32'
app.setAsDefaultProtocolClient('bluestone')

let fileChangedWindow: BrowserWindow | null = null
const openSpaceMap = new Map<BrowserWindow, string>()
function createWindow() {
  const {width, height} = screen.getPrimaryDisplay().workAreaSize
  const window = new BrowserWindow({
    width,
    height,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#191919' : '#ffffff',
    ...windowOptions
  })
  window.webContents.session.webRequest.onBeforeSendHeaders(
    (details, callback) => {
      callback({requestHeaders: {Origin: '*', ...details.requestHeaders}})
    },
  )
  window.on('enter-full-screen', () => {
    window.webContents?.send('enter-full-screen')
  })
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const allowTimeHeader = {
      ['Access-control-allow-headers']: 'time,authorization,device-id,version,content-type',
      ['Access-Control-Allow-Methods']: 'POST,PUT,GET,DELETE'
    }
    if (details.responseHeaders?.['access-control-allow-origin'] || details.responseHeaders?.['Access-Control-Allow-Origin']) {
      callback({responseHeaders: {
        ...allowTimeHeader,
        ...details.responseHeaders
      }})
    } else {
      callback({
        responseHeaders: {
          ...allowTimeHeader,
          'Access-Control-Allow-Origin': ['*'],
          ...details.responseHeaders,
        },
      })
    }
  })
  window.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => window.webContents.replaceMisspelling(suggestion)
        })
      )
    }

    if (params.misspelledWord) {
      if (menu.items.length) {
        menu.append(new MenuItem({type: 'separator'}))
      }
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () =>
            window.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
    }
    if (menu.items.length) {
      menu.popup()
    }
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
    openSpaceMap.delete(window)
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
  })
  window.show()
  return window
}

let waitOpenFile = ''
let waitOpenProtocol = ''
app.on('will-finish-launching', () => {
  // Event fired When someone drags files onto the icon while your app is running
  app.on("open-file", (event, file) => {
    event.preventDefault()
    if (app.isReady() === false) {
      waitOpenFile = file
    } else {
      const wins = BrowserWindow.getAllWindows()
      if (wins.length) {
        const last = wins[wins.length - 1]
        last.webContents.send('open-path', file)
      } else {
        const win = createWindow()
        win.on('ready-to-show', () => {
          setTimeout(() => {
            win.webContents.send('open-path', file)
          }, 100)
        })
      }
    }
  })
  app.on('open-url', (event, schema) => {
    if (schema?.startsWith('bluestone://')) {
      const url = new URL(schema)
      if (url.searchParams.get('path')) {
        const win = BrowserWindow.getAllWindows()?.find(w => !openSpaceMap.get(w) || openSpaceMap.get(w) === url.searchParams.get('space'))
        if (win) {
          win.focus()
          win.webContents.send('open-protocol', {
            space: url.searchParams.get('space'),
            hash: url.searchParams.get('hash'),
            path: url.searchParams.get('path')
          })
        } else {
          waitOpenProtocol = schema
          if (app.isReady()) {
            preCreate()
          }
        }
      }
    }
  })
})

const preCreate = () => {
  const win = createWindow()
  if (waitOpenFile) {
    win.on('ready-to-show', () => {
      setTimeout(() => {
        win.webContents.send('open-path', waitOpenFile)
      }, 100)
    })
    waitOpenFile = ''
  }
  if (waitOpenProtocol) {
    const url = new URL(waitOpenProtocol)
    win.on('ready-to-show', () => {
      setTimeout(() => {
        win.webContents.send('open-protocol', {
          space: url.searchParams.get('space'),
          hash: url.searchParams.get('hash'),
          path: url.searchParams.get('path')
        })
      }, 200)
    })
    waitOpenProtocol = ''
  }
}
app.whenReady().then(() => {
  createAppMenus()
  registerApi()
  if (isWindows) {
    app.on('browser-window-focus', () => {
      globalShortcut.register("CommandOrControl+W", () => {
        BrowserWindow.getFocusedWindow()?.webContents.send('close-current-tab')
      })
    })

    app.on('browser-window-blur', () => {
      globalShortcut.unregisterAll()
    })
  }
  new AppUpdate()
  ipcMain.on('create-window', (e, filePath?: string) => {
    createWindow()
  })

  ipcMain.on('file-changed', (e) => {
    fileChangedWindow = BrowserWindow.fromWebContents(e.sender)
  })

  ipcMain.handle('open-space', (e, id: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      openSpaceMap.set(win, id)
    }
  })

  ipcMain.handle('find-other-space', (e, id: string) => {
    for (const item of openSpaceMap) {
      if (item[1] === id) {
        return true
      }
    }
    return false
  })

  ipcMain.on('file-saved', () => {
    fileChangedWindow = null
  })

  if (isWindows) electronApp.setAppUserModelId('me.bluemd')
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  if (process.argv[1]) waitOpenFile = process.argv[1] || ''
  if (waitOpenFile === '.') waitOpenFile = ''
  if (waitOpenFile && !isAbsolute(waitOpenFile)) {
    waitOpenFile = join(process.cwd(), waitOpenFile)
  }
  preCreate()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      preCreate()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
