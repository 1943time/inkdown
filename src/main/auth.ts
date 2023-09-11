import {BrowserWindow, ipcMain} from 'electron'
import Store from 'electron-store'
export const listener = (store: Store) => {
  ipcMain.on('set-token', (e, token: string) => {
    store.set('user-token', token)
  })
  ipcMain.handle('get-token', () => {
    return store.get('user-token') || ''
  })
}
export const openAuth = (type: 'github') => {
  const originWin = BrowserWindow.getFocusedWindow()
  if (!originWin) return
  const win = new BrowserWindow({
    width: 600, height: 700, show: false, title: 'loading...',
    minimizable: false,
    maximizable: false,
    webPreferences: {webSecurity: false}
  })
  let url = ''
  switch (type) {
    case 'github':
      url = `https://github.com/login/oauth/authorize?client_id=4d3be95c3871c98c5ac0&scope=user:email`
      break
  }
  win.loadURL(url)
  win.show()
  const callback = (url: string) => {
    if (url.includes('official/auth')) {
      const code = url.match(/code=([\w]+)/)
      if (code) {
        originWin.webContents.send('auth-login', {
          type: 'github',
          token: code[1]
        })
      }
      // win.webContents.session.clearStorageData()
      win.close()
    }
  }
  win.webContents.on('will-navigate', (e, url) => {
    callback(url)
  })
  win.webContents.on('will-redirect', (e, url) => {
    callback(url)
  })
}
