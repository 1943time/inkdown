import { ipcMain, dialog, OpenDialogOptions, SaveDialogOptions, app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

ipcMain.handle('showOpenDialog', async (_, options: OpenDialogOptions) => {
  return dialog.showOpenDialog(options)
})

ipcMain.handle('showSaveDialog', async (_, options: SaveDialogOptions) => {
  return dialog.showSaveDialog(options)
})

ipcMain.handle('getAssetsPath', async () => {
  const assetsPath = join(app.getPath('userData'), 'assets')
  if (!existsSync(assetsPath)) {
    mkdirSync(assetsPath, { recursive: true })
  }
  return assetsPath
})
ipcMain.handle('getFilePath', async (_, name: string) => {
  return join(app.getPath('userData'), 'assets', name)
})
