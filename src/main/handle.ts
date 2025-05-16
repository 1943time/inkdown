import {
  ipcMain,
  dialog,
  OpenDialogOptions,
  SaveDialogOptions,
  app,
  nativeImage,
  clipboard,
  BrowserWindow,
  shell,
  WebContentsView
} from 'electron'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { writeFile } from 'fs/promises'
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

ipcMain.handle('downloadImage', async (_, url: string, name: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      return { exceed: true }
    }

    const buffer = await response.arrayBuffer()
    const filePath = join(app.getPath('userData'), 'assets', name)
    await writeFile(filePath, Buffer.from(buffer))
    return { name, exceed: false }
  } catch (e) {
    console.error('download image error:', e)
    return null
  }
})

ipcMain.on('print-pdf', async (e, data: { docId?: string; chatId?: string }) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) {
    const view = new WebContentsView({
      webPreferences: {
        webviewTag: true,
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })
    await view.webContents.loadFile(join(__dirname, '../renderer/worker.html'))
    // view.webContents.openDevTools()
    win.contentView.addChildView(view)
    view.setBounds({ x: 0, y: 0, width: 1, height: 1 })
    ipcMain.handleOnce('get-print-data', () => {
      return data
    })
    const ready = async () => {
      try {
        const save = await dialog.showSaveDialog({
          filters: [{ name: 'pdf', extensions: ['pdf'] }]
        })
        if (save.filePath) {
          const buffer = await view.webContents.printToPDF({
            printBackground: true,
            displayHeaderFooter: true,
            generateDocumentOutline: true,
            margins: {
              marginType: 'custom',
              bottom: 0,
              left: 0,
              top: 0,
              right: 0
            }
          })
          writeFileSync(save.filePath, buffer as any)
          shell.showItemInFolder(save.filePath)
        }
      } finally {
        win.contentView.removeChildView(view)
      }
    }
    ipcMain.once('print-pdf-ready', ready)
  }
})

ipcMain.on('showInFinder', (_, path: string) => {
  shell.showItemInFolder(path)
})
