import { ElectronAPI } from '@electron-toolkit/preload'
import {IThemedToken} from 'shiki'
import {dialog} from 'electron'
import * as fs from 'fs/promises'
import {AliApi} from './sdk/ali'
import {Sdk} from './sdk'
import {Got} from 'got'
import {ExtendOptions} from 'got/dist/source/types'


declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      sdk: typeof Sdk,
      dev: boolean
      got: Got
      createFormData(data: Record<string, string | number | {path: string}>): FormData
      resetHighlighter: () => Promise<any>
      getThemeBg: (theme: string) => string
      themes: string[]
      loadCodeTheme: (theme: string) => Promise<string>
      uploadFile<T = any>(options: {
        url: string
        data: Record<string, string | number | {path: string}>
      }, gotInstance?: Got): Promise<T>
      toUnix: (path: string) => string
      md5: (str: string | Buffer) => string
      createHttp: (options: ExtendOptions) => Got
      getClipboardText: () => string
      getClipboardFile: () => string
      writeClipboardText: (str: string) => void
      mimeType: (file: string) => string
      // checkedLatest: () => Promise<any>
      copyToClipboard: (str: string) => string
      highlightCode(code: string, lang: string): IThemedToken[][]
      highlightInlineFormula(code: string): IThemedToken[][]
      highlightCodeToString(code: string, lang: string): string
      langSet: Set<string>
      preloadUrl: string
      baseUrl: string
      fs: typeof fs
      watch: (path: string, cb: (event: 'update' | 'remove', path: string) => void) => Promise<void>,
      offWatcher: (path: string) => Promise<void> | undefined,
      ready: () => Promise<boolean>
    }
  }
}
