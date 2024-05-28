import { makeAutoObservable, runInAction } from 'mobx'
import { MainApi } from '../api/main'
import mermaid from 'mermaid'
import { shareStore } from '../server/store'
import { highlighter } from '../editor/utils/highlight'
import { imageBed } from '../utils/imageBed'
import { db } from './db'
import { treeStore } from './tree'
import { clearAllCodeCache, clearInlineKatex } from '../editor/plugins/useHighlight'

class ConfigStore {
  visible = false
  enableUpgrade = false
  openUpdateDialog = false
  codeDark = false
  readonly spaceColors = ['sky', 'cyan', 'violet', 'slate', 'purple', 'green', 'amber', 'pink']
  config = {
    showLeading: true,
    autoDownload: false,
    autoOpenSpace: false,
    theme: 'system' as 'system' | 'dark' | 'light',
    leadingWidth: 260,
    dark: false,
    locale: 'en' as 'en' | 'zh',
    codeLineNumber: true,
    codeTabSize: 2,
    editorTextSize: 16,
    codeTheme: 'auto',
    codeAutoBreak: false,
    mas: false,
    symbolHighlight: true,
    dragToSort: true,
    spellCheck: false,
    editorWidth: 700,
    autoRebuild: true,
    showHiddenFiles: false,
    editorLineHeight: 'default' as 'default' | 'loose' | 'compact',
    interfaceFont: 'System',
    editorFont: 'System',
    isLinux: false,
    codeBackground: '',
    turnOnImageBed: false
  }
  timer = 0
  homePath = ''
  deviceId = ''
  get mas() {
    return this.config.mas || false
  }
  get tab() {
    return ' '.repeat(this.config.codeTabSize)
  }
  get systemDark() {
    return window.matchMedia && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  }
  get zh() {
    return this.config.locale === 'zh'
  }
  get defaultTheme() {
    return this.config.dark ? 'slack-dark' : 'slack-ochin'
  }

  get curCodeTheme() {
    return this.config.codeTheme === 'auto' ? this.defaultTheme : this.config.codeTheme
  }
  constructor() {
    makeAutoObservable(this, {
      timer: false,
      deviceId: false
    })
    window.electron.ipcRenderer.on('openSet', () => {
      this.initial()
      runInAction(() => {
        this.visible = true
      })
    })
  }
  async reloadHighlighter(refresh = false) {
    try {
      await highlighter.loadTheme(this.curCodeTheme as any)
      highlighter.setTheme(this.curCodeTheme)
      if (refresh) {
        requestIdleCallback(() => {
          for (const t of treeStore.tabs) {
            clearAllCodeCache(t.store.editor)
            clearInlineKatex(t.store.editor)
            t.store.setState((state) => (state.pauseCodeHighlight = true))
            setTimeout(() => {
              t.store.setState((state) => {
                state.pauseCodeHighlight = false
                state.refreshHighlight = !state.refreshHighlight
              })
              runInAction(() => {
                const theme = highlighter.getTheme(this.curCodeTheme)
                configStore.config.codeBackground = theme.bg
                configStore.codeDark = theme.type === 'dark'
              })
            }, 30)
          }
        })
      }
    } catch (e) {
      console.error('reload highlighter', e)
    }
  }
  async setTheme(theme: typeof this.config.theme, broadcast = true) {
    if (theme === this.config.theme) return
    const dark = await MainApi.getSystemDark()
    runInAction(() => {
      this.config.theme = theme
      if (broadcast) {
        MainApi.sendToAll('changeConfig', 'theme', theme)
      }
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        this.config.dark = true
        mermaid.initialize({
          theme: 'dark'
        })
      } else if (theme === 'system') {
        this.config.dark = dark
        if (dark) {
          mermaid.initialize({
            theme: 'dark'
          })
          document.documentElement.classList.add('dark')
        } else {
          mermaid.initialize({
            theme: 'default'
          })
          document.documentElement.classList.remove('dark')
        }
      } else {
        mermaid.initialize({
          theme: 'default'
        })
        document.documentElement.classList.remove('dark')
        this.config.dark = false
      }
      localStorage.setItem('theme', this.config.dark ? 'dark' : 'light')
      this.setConfig('theme', theme)
    })
  }

  toggleShowLeading() {
    this.setConfig('showLeading', !this.config.showLeading)
  }

  async setConfig<T extends keyof typeof this.config>(key: T, value: (typeof this.config)[T]) {
    this.config[key] = value
    const record = await db.config.where('key').equals(key).first()
    if (record) {
      await db.config.update(record.key, { value })
    } else {
      await db.config.add({ key, value })
    }
    if (['codeTabSize', 'codeTheme', 'codeLineNumber'].includes(key) && shareStore.serviceConfig) {
      shareStore.api.setPreferences({
        [key]: value
      })
    }
  }
  setInterfaceFont(value: string) {
    for (let key of document.body.classList.values()) {
      if (key.startsWith('font-')) {
        document.body.classList.remove(key)
      }
    }
    document.body.classList.add('font-' + value!)
    this.setConfig('interfaceFont', value)
  }
  async initial() {
    const config = await db.config.toArray()
    return new Promise((resolve) => {
      if (localStorage.getItem('pick-route')) {
        this.setConfig('turnOnImageBed', true)
      }
      runInAction(() => {
        this.config = {
          ...this.config,
          ...Object.fromEntries(config.map((c) => [c.key, c.value]))
        }
        this.config.dark =
          this.config.theme === 'system' ? this.systemDark : this.config.theme === 'dark'
      })
      localStorage.setItem('theme', this.config.dark ? 'dark' : 'light')
      if (this.config.dark) {
        mermaid.initialize({
          theme: 'dark'
        })
      }
      imageBed.initial()
      document.body.classList.add('font-' + this.config.interfaceFont)
      window.electron.ipcRenderer.invoke('get-system').then(res => {
        runInAction(() => this.config.mas = res === 'mas')
      })
      MainApi.getPath('home').then((res) => {
        this.homePath = res
        if (this.mas) {
          const m = this.homePath.match(/\/Users\/[^\/]+/)
          if (m) this.homePath = m[0]
        }
        resolve(true)
      })
      shareStore.initial()
    }).catch((e) => {
      console.log('catch', e)
    })
  }
}

export const configStore = new ConfigStore()
