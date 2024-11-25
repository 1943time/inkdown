import { clipboard } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import * as fs from 'fs/promises'
import watch, { Watcher } from 'node-watch'
import { createHash } from 'crypto'
import { toUnix } from 'upath'
import mime from 'mime-types'
import nodeFetch, { RequestInit } from 'node-fetch'
const isWindows = process.platform === 'win32'
let watchers = new Map<string, Watcher>()
export const api = {
  copyToClipboard(str: string) {
    clipboard.writeText(str)
  },
  getClipboardText() {
    return clipboard.readText('clipboard')
  },
  getClipboardFilePath() {
    if (process.platform === 'darwin') {
      return decodeURIComponent(clipboard.read('public.file-url')?.replace('file://', '') || '')
    } else {
      const text = clipboard.readBuffer('FileNameW')?.toString('ucs2')
      if (text) {
        return decodeURIComponent(text.replace(new RegExp(String.fromCharCode(0), 'g'), ''))
      }
      return ''
    }
  },
  writeClipboardText(str: string) {
    return clipboard.writeText(str, 'clipboard')
  },
  toUnix(path: string, force = false) {
    return electronAPI.process.platform === 'win32' || force ? toUnix(path) : path
  },
  fetch(url: string, init?: RequestInit) {
    return nodeFetch(url, init)
  },
  mimeType(file: string) {
    return mime.lookup(file) || ''
  },
  fs,
  watch: async (
    path: string,
    cb: (event: 'remove' | 'update', path: string) => void
  ) => {
    if (watchers.get(path)) await watchers.get(path)!.close()
    const watcher = watch(path, {
      recursive: true
    })
    watcher!.on('change', cb)
    watchers.set(path, watcher)
  },
  md5(str: string | Buffer) {
    // @ts-ignore
    return createHash('md5').update(str).digest('hex')
  },
  offWatcher(path: string) {
    const watcher = watchers.get(path)
    if (watcher) {
      return watcher.close()
    }
    return
  }
}
