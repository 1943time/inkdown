import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import os from 'os'
import log from 'electron-log'
autoUpdater.autoDownload = false
log.initialize()
autoUpdater.logger = log
log.transports.file.level = 'info'
export const registerUpdate = () => {
  if (app.isPackaged) {
    const feedUrl = `http://localhost:3000/update/${app.getVersion()}/${os.platform()}/${os.arch()}`
    try {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: feedUrl
      })
      autoUpdater.on('error', (err) => {
        log.error('更新出错:', err == null ? 'unknown' : (err.stack || err).toString())
      })

      autoUpdater.on('checking-for-update', () => {
        log.info('正在检查更新...')
      })
      autoUpdater.on('update-not-available', () => {
        log.info('当前已是最新版本')
      })
      // 发现可用更新
      autoUpdater.on('update-available', (info) => {
        log.info('发现新版本:', info.version)
        autoUpdater.downloadUpdate()
      })
      autoUpdater.on('update-downloaded', (info) => {
        log.info('更新下载完成，版本:', info.version)
        const windows = BrowserWindow.getAllWindows()
        windows.forEach((window) => {
          window.webContents.send('update-ready')
        })
      })
      autoUpdater.checkForUpdates()
      setInterval(
        () => {
          autoUpdater.checkForUpdates()
        },
        60 * 60 * 1000
      )
      ipcMain.on('udpate-and-restart', () => {
        autoUpdater.quitAndInstall()
      })
    } catch (e) {
      log.error('设置更新源失败:', e)
    }
  }
}
