import { readFileSync, readdirSync, statSync, existsSync, renameSync, mkdirSync } from 'fs'
import { writeFile, readFile, cp, rename } from 'fs/promises'
import { join, basename, relative, extname, sep, isAbsolute } from 'path'
import { app } from 'electron'
import { ipcRenderer, clipboard, nativeImage } from 'electron'
import { lookup } from 'mime-types'
const dev = process.env.NODE_ENV === 'development'

export const mediaType = (name?: string) => {
  name = name || ''
  name = name.split('?')[0]
  const ext = name.match(/\.\w+$/)?.[0]?.toLowerCase()
  if (!ext) return 'other'
  if (['.md', '.markdown'].includes(ext)) return 'markdown'
  if (['.png', '.jpg', '.gif', '.svg', '.jpeg', '.webp', '.avif', '.apng'].includes(ext))
    return 'image'
  if (['.mp3', '.ogg', '.aac', '.wav', '.oga', '.m4a'].includes(ext)) return 'audio'
  if (['.mpg', '.mp4', '.webm', '.mpeg', '.ogv', '.wmv', '.m4v', 'av1', 'hevc'].includes(ext))
    return 'video'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].includes(ext))
    return 'document'
  return 'other'
}

export const Api = {
  dev,
  fs: {
    readFileSync,
    readdirSync,
    writeFile,
    existsSync,
    cp,
    rename,
    renameSync,
    mkdirSync,
    readFile,
    lookup(filePath: string) {
      return lookup(filePath)
    },
    openFile: (path: string) => {
      ipcRenderer.send('open-in-default-app', path)
    },
    writeBuffer(filePath: string, buffer: ArrayBuffer) {
      return writeFile(filePath, Buffer.from(buffer))
    },
    statSync(filePath: string) {
      try {
        const s = statSync(filePath)
        return {
          folder: s.isDirectory(),
          ctime: s.ctime.valueOf(),
          mtime: s.mtime.valueOf(),
          size: s.size
        }
      } catch (e) {
        console.error(e)
        return null
      }
    }
  },
  getClipboardText() {
    return clipboard.readText()
  },
  writeToClipboard(text: string) {
    return clipboard.writeText(text)
  },
  async downloadUrl(url: string) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const save = await ipcRenderer.invoke('showSaveDialog', {
      filters: [{ name: 'type', extensions: [url.match(/\.\w+$/i)?.[0] || ''] }]
    })
    if (save.filePath) {
      const arrayBuffer = await response.arrayBuffer()

      const buffer = Buffer.from(arrayBuffer)
      await writeFile(save.filePath, buffer)
    }
  },
  getFilePath(name: string) {
    return join(app.getPath('userData'), 'assets', name)
  },
  writeImageToClipboard(image: string) {
    try {
      if (image.startsWith('data:image')) {
        // base64图片
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const object = nativeImage.createFromBuffer(imageBuffer)
        clipboard.writeImage(object)
      } else {
        const object = nativeImage.createFromPath(image)
        clipboard.writeImage(object)
      }
      return true
    } catch (e) {
      console.error('write image to clipboard error:', e)
      return false
    }
  },
  path: {
    join,
    basename,
    relative,
    extname,
    sep,
    isAbsolute
  }
}
