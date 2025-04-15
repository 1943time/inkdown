import { readFileSync, readdirSync, statSync, existsSync, cpSync, renameSync, mkdirSync } from 'fs'
import { writeFile, readFile, cp } from 'fs/promises'
import { join, basename, relative, extname, sep, isAbsolute } from 'path'
import { app } from 'electron'
import {
  ipcRenderer,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  clipboard,
  SaveDialogReturnValue
} from 'electron'
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
    renameSync,
    mkdirSync,
    readFile,
    moveToTrash: (path: string) => {
      return ipcRenderer.invoke('move-to-trash', path)
    },
    lookup(filePath: string) {
      return lookup(filePath)
    },
    openFile: (path: string) => {
      ipcRenderer.send('open-in-default-app', path)
    },
    showInFinder: (path: string) => {
      ipcRenderer.send('openInFolder', path)
    },
    writeBuffer(filePath: string, buffer: ArrayBuffer) {
      return writeFile(filePath, Buffer.from(buffer))
    },
    statSync(filePath: string) {
      const s = statSync(filePath)
      return {
        folder: s.isDirectory(),
        ctime: s.ctime.valueOf(),
        mtime: s.mtime.valueOf(),
        size: s.size
      }
    }
  },
  getClipboardText() {
    return clipboard.readText()
  },
  copyToClipboard(text: string) {
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
  dialog: {
    showOpenDialog(options: OpenDialogOptions) {
      return ipcRenderer.invoke('showOpenDialog', options) as Promise<OpenDialogReturnValue>
    },
    showSaveIdalog(options: SaveDialogOptions) {
      return ipcRenderer.invoke('showSaveDialog', options) as Promise<SaveDialogReturnValue>
    }
  },
  getFilePath(name: string) {
    return join(app.getPath('userData'), 'assets', name)
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
