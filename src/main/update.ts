import { autoUpdater, CancellationToken } from 'electron-updater'
import log from 'electron-log'
import {BrowserWindow, ipcMain, app} from 'electron'
autoUpdater.logger = log
// @ts-ignore
autoUpdater.logger.transports.file.level = 'info'
autoUpdater.setFeedURL({
  provider: 'github',
  owner: '1943time',
  repo: 'bluestone'
})
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export class AppUpdate {
  cancelToken?: CancellationToken
  manual = false
  get win() {
    return BrowserWindow.getFocusedWindow()
  }
  constructor() {
    // setTimeout(() => {
    //   autoUpdater.checkForUpdatesAndNotify()
    // }, 3000)

    ipcMain.handle('check-updated', () => {
      this.manual = true
      autoUpdater.checkForUpdatesAndNotify()
      return new Promise((resolve, reject) => {
        autoUpdater.once('update-available', resolve)
        autoUpdater.once('update-not-available', reject)
      })
    })

    ipcMain.handle('start-update', () => {
      this.cancelToken = new CancellationToken()
      return autoUpdater.downloadUpdate(this.cancelToken)
    })

    ipcMain.on('cancel-update', () => {
      this.cancelToken?.cancel()
      this.cancelToken?.dispose()
    })

    ipcMain.on('install-update', () => {
      autoUpdater.quitAndInstall()
    })

    autoUpdater.on('update-available', (info) => {
      this.win?.webContents.send('update-available', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      this.win?.webContents.send('update-not-available', this.manual)
    })

    autoUpdater.on('error', (e, message) => {
      this.win?.webContents.send('update-error', message)
    })
    autoUpdater.on('download-progress', (progressObj) => {
      this.win?.webContents.send('update-progress', progressObj)
    })
    autoUpdater.on('update-downloaded', (info) => {
      this.win?.webContents.send('update-downloaded', info)
    })
  }
}
