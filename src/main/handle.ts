import {
  ipcMain,
  dialog,
  OpenDialogOptions,
  SaveDialogOptions,
  app,
  nativeImage,
  clipboard
} from 'electron'
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

ipcMain.handle('userDataPath', async () => {
  return app.getPath('userData')
})
ipcMain.handle('writeImageToClipboard', async (_, image: string) => {
  try {
    if (image.startsWith('data:image')) {
      // base64图片
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      const object = nativeImage.createFromBuffer(imageBuffer)
      clipboard.writeImage(object)
    } else {
      // 文件路径
      const object = nativeImage.createFromPath(image)
      clipboard.writeImage(object)
    }
    return true
  } catch (e) {
    console.error('write image to clipboard error:', e)
    return false
  }
})
