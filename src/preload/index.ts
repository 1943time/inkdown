import {contextBridge, ipcRenderer, clipboard} from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {getHighlighter, Highlighter } from 'shiki'
import {BUNDLED_LANGUAGES} from 'shiki'
import * as fs from 'fs/promises'
const langSet = new Set(BUNDLED_LANGUAGES.map(l => [l.id, ...(l.aliases || [])]).flat(2))
let highlighter:Highlighter | null = null
import * as chokidar from 'chokidar'
import {createHash} from 'crypto'

let watchers = new Map<string, chokidar.FSWatcher>()
let ready:any = null
const api = {
  preloadUrl: '',
  baseUrl: '',
  langSet,
  copyToClipboard(str: string) {
    clipboard.writeText(str)
  },
  highlightCode(code: string, lang: string) {
    return highlighter?.codeToThemedTokens(code, lang, undefined, {includeExplanation: false}) || []
  },
  fs,
  watch: async (path: string, cb: (event: 'add'| 'addDir' | 'change'| 'unlink'| 'unlinkDir', path: string) => void) => {
    if (watchers.get(path)) await watchers.get(path)!.close()
    const watcher = chokidar.watch(path, {
      ignoreInitial: true
    })
    watcher!.on('all', cb)
    watchers.set(path, watcher)
  },
  highlightCodeToString(code: string, lang: string) {
    return langSet.has(lang) ? highlighter?.codeToHtml(code, {lang}) : code
  },
  md5(str: string | Buffer) {
    return createHash('md5').update(str).digest('hex')
  },
  async ready() {
    this.baseUrl = await ipcRenderer.invoke('get-base-url')
    this.preloadUrl = await ipcRenderer.invoke('get-preload-url')
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
