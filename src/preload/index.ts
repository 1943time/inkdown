import {contextBridge, ipcRenderer, clipboard} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {getHighlighter, Highlighter } from 'shiki'
import {BUNDLED_LANGUAGES} from 'shiki'
import * as fs from 'fs/promises'
import watch, {Watcher} from 'node-watch'
import {createHash} from 'crypto'
import got from 'got'
import {ExtendOptions} from 'got/dist/source/types'
const langSet = new Set(BUNDLED_LANGUAGES.map(l => [l.id, ...(l.aliases || [])]).flat(2))
let highlighter:Highlighter | null = null
import {toUnix} from 'upath'
import mime from 'mime-types'
import {Service} from './service'
let watchers = new Map<string, Watcher>()
let ready:any = null
const api = {
  langSet,
  service: new Service,
  copyToClipboard(str: string) {
    clipboard.writeText(str)
  },
  getClipboardText() {
    return clipboard.readText('clipboard')
  },
  got,
  writeClipboardText(str: string) {
    return clipboard.writeText(str, 'clipboard')
  },
  createHttp(options: ExtendOptions) {
    return got.extend(options)
  },
  highlightCode(code: string, lang: string) {
    return highlighter?.codeToThemedTokens(code, lang, undefined, {includeExplanation: false}) || []
  },
  toUnix(path: string, force = false) {
    return electronAPI.process.platform === 'win32' || force ? toUnix(path) : path
  },
  mimeType(file: string) {
    return mime.lookup(file) || ''
  },
  fs,
  watch: async (path: string, cb: (event: 'add'| 'addDir' | 'change'| 'unlink'| 'unlinkDir', path: string) => void) => {
    if (watchers.get(path)) await watchers.get(path)!.close()
    const watcher = watch(path, {
      recursive: true
    })
    watcher!.on('change', cb)
    watchers.set(path, watcher)
  },
  highlightCodeToString(code: string, lang: string) {
    return langSet.has(lang) ? highlighter?.codeToHtml(code, {lang}) : code
  },
  md5(str: string | Buffer) {
    return createHash('md5').update(str).digest('hex')
  },
  async ready() {
    const config = await ipcRenderer.invoke('getConfig')
    return new Promise(resolve => {
      if (ready) {
        resolve(true)
      } else {
        getHighlighter({
          theme: config.codeTheme
        }).then(res => {
          highlighter = res
          resolve(true)
          ready = true
        })
      }
    })
  },
  offWatcher(path: string) {
    const watcher = watchers.get(path)
    if (watcher) {
      return watcher.close()
    }
    return
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
