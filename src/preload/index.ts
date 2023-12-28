import {contextBridge, ipcRenderer, clipboard, ipcMain} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {getHighlighter, Highlighter } from 'shiki'
import {BUNDLED_LANGUAGES} from 'shiki'
import * as fs from 'fs/promises'
import watch, {Watcher} from 'node-watch'
import {createHash} from 'crypto'
import got, {Got} from 'got'
import {ExtendOptions} from 'got/dist/source/types'
import {toUnix} from 'upath'
import mime from 'mime-types'
import FormData from 'form-data'
import {createReadStream} from 'fs'
const langSet = new Set(BUNDLED_LANGUAGES.map(l => [l.id, ...(l.aliases || [])]).flat(2))
let highlighter:Highlighter | null = null
let watchers = new Map<string, Watcher>()
let ready:any = null
const api = {
  langSet,
  copyToClipboard(str: string) {
    clipboard.writeText(str)
  },
  getClipboardText() {
    return clipboard.readText('clipboard')
  },
  got,
  uploadFile(options: {
    url: string
    domain: string
    data: Record<string, string | number | {path: string}>
  }, gotInstance?: Got) {
    const form = new FormData()
    Object.entries(options.data).forEach(item => {
      if (typeof item[1] === 'object' && item[1].path) {
        form.append(item[0], createReadStream(item[1].path))
      } else {
        form.append(item[0], item[1])
      }
    })
    return (gotInstance || got).post(options.url, {
      body: form
    }).json()
  },
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
  async resetHighlighter() {
    const config = await ipcRenderer.invoke('getConfig')
    return getHighlighter({
      theme: config.codeTheme
    }).then(res => {
      highlighter = res
    })
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
