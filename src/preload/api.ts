import { readFileSync, readdirSync, statSync, existsSync, cpSync, renameSync, mkdirSync } from 'fs'
import { writeFile, readFile } from 'fs/promises'
import { join, basename, relative, extname, sep, isAbsolute } from 'path'
import {
  ipcRenderer,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  clipboard,
  SaveDialogReturnValue
} from 'electron'
import { lookup } from 'mime-types'
export const Api = {
  fs: {
    readFileSync,
    readdirSync,
    writeFile,
    existsSync,
    cpSync,
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
  path: {
    join,
    basename,
    relative,
    extname,
    sep,
    isAbsolute
  }
}
