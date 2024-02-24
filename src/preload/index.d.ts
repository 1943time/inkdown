import { ElectronAPI } from '@electron-toolkit/preload'
import {IThemedToken} from 'shiki'
import {dialog} from 'electron'
import * as fs from 'fs/promises'
import {AliApi} from './sdk/ali'
import {Sdk} from './sdk'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      sdk: typeof Sdk,
      dev: boolean
      createFormData(data: Record<string, string | number | {path: string}>): FormData
      resetHighlighter: () => Promise<any>
      toUnix: (path: string) => string
      md5: (str: string | Buffer) => string
      getClipboardText: () => string
      getClipboardFile: () => string
      writeClipboardText: (str: string) => void
      mimeType: (file: string) => string
      // checkedLatest: () => Promise<any>
      copyToClipboard: (str: string) => string
      preloadUrl: string
      baseUrl: string
      fs: typeof fs
      watch: (path: string, cb: (event: 'update' | 'remove', path: string) => void) => Promise<void>,
      offWatcher: (path: string) => Promise<void> | undefined,
      ready: () => Promise<boolean>
    }
  }
}
