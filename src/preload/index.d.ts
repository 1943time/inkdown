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
      test: () => void
      md5: (str: string | Buffer) => string
      copyToClipboard: (str: string) => string
      highlightCode(code: string, lang: string): IThemedToken[][]
      highlightCodeToString(code: string, lang: string): string
      langSet: Set<string>
      preloadUrl: string
      baseUrl: string
      fs: typeof fs
      watch: (path: string, cb: (event: 'add'| 'addDir' | 'change'| 'unlink'| 'unlinkDir', path: string) => void) => Promise<void>,
      offWatcher: (path: string) => Promise<void> | undefined,
      ready: () => Promise<boolean>
    }
  }
}
