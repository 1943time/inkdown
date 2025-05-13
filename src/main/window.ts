import { BrowserWindow, screen, nativeTheme, MenuItem, Menu, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
export type Bound = {
  width: number
  height: number
  x: number
  y: number
  id?: string
  focus?: boolean
}
export let lastCloseWindow: Bound | null = null
export const winMap = new WeakMap<BrowserWindow, string>()

export function createWindow(bound?: Bound | null) {
  let changed = false
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const window = new BrowserWindow({
    width: bound?.width || width,
    height: bound?.height || height,
    x: bound?.x,
    y: bound?.y,
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#191919' : '#ffffff',
    show: false,
    minWidth: 700,
    minHeight: 640,
    webPreferences: {
      webviewTag: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  if (bound?.id) {
    winMap.set(window, bound.id)
  }
  window.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { Origin: '*', ...details.requestHeaders } })
  })
  window.on('enter-full-screen', () => {
    window.webContents?.send('enter-full-screen')
  })
  window.webContents.on('ipc-message', (_, channel, ...args) => {
    if (channel === 'docChange') {
      changed = args[0]
    }
  })
  window.on('close', async (e) => {
    if (changed) {
      e.preventDefault()
      window.webContents.send('save-doc')
      setTimeout(() => {
        changed = false
        window.close()
      }, 200)
    }
  })
  window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    if (details.responseHeaders?.['x-frame-options']) {
      delete details.responseHeaders?.['x-frame-options']
    }
    for (const header in details.responseHeaders) {
      if (header.toLocaleLowerCase() === 'x-frame-options') {
        delete details.responseHeaders[header]
      }
    }
    const allowTimeHeader = {
      ['Access-control-allow-headers']: 'time,authorization,device-id,version,content-type',
      ['Access-Control-Allow-Methods']: 'POST,PUT,GET,DELETE'
    }
    if (
      details.responseHeaders?.['access-control-allow-origin'] ||
      details.responseHeaders?.['Access-Control-Allow-Origin']
    ) {
      callback({
        responseHeaders: {
          ...allowTimeHeader,
          ...details.responseHeaders
        }
      })
    } else {
      callback({
        responseHeaders: {
          ...allowTimeHeader,
          'Access-Control-Allow-Origin': ['*'],
          ...details.responseHeaders
        }
      })
    }
  })
  window.webContents.on('context-menu', (_, params) => {
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
        menu.append(new MenuItem({ type: 'separator' }))
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
    return { action: 'deny' }
  })
  window.on('focus', () => {
    window.webContents.send('window-focus')
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  window.on('blur', () => {
    window.webContents.send('window-blur')
  })
  window.on('close', () => {
    window.webContents.send('save')
    const bound = window.getBounds()
    lastCloseWindow = {
      width: bound.width,
      height: bound.height,
      x: bound.x,
      y: bound.y,
      id: winMap.get(window),
      focus: true
    }
  })
  if (bound?.focus) {
    setTimeout(() => {
      window.show()
    }, 300)
  }
  window.show()
  return window
}
