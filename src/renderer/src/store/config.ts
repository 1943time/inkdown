import {action, makeAutoObservable, runInAction} from 'mobx'
import {MainApi} from '../api/main'
import {ipcRenderer} from 'electron'
import mermaid from 'mermaid'
import {shareStore} from '../server/store'

class ConfigStore {
  visible = false
  enableUpgrade = false
  openUpdateDialog = false
  config = {
    showLeading: true,
    autoDownload: false,
    theme: 'system' as 'system' | 'dark' | 'light',
    dark: false,
    locale: 'en' as 'en' | 'zh',
    codeLineNumber: false,
    codeTabSize: 4,
    editorTextSize: 16,
    codeTheme: 'material-theme-palenight',
    leadingLevel: 4,
    mas: false,
    showCharactersCount: true,
    imagesFolder: '.images',
    dragToSort: true,
    spellCheck: false,
    editorMaxWidth: 900,
    autoRebuild: true,
    renameFileWhenSaving: false,
    showFloatBar: true,
    showRemoveFileDialog: true,
    fileWatcher: true,
    relativePathForImageStore: false,
    showHiddenFiles: false,
    editorLineHeight: 'default' as 'default' | 'loose' | 'compact',
    interfaceFont: 'System',
    editorFont: 'System',
    isLinux: false
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
  get zh() {
    return this.config.locale === 'zh'
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
    window.electron.ipcRenderer.on('changeConfig', action((e, key: any, value: any) => {
      if (key === 'theme') {
        this.setTheme(value, false)
      }
      this.config[key] = value
    }))
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
      window.electron.ipcRenderer.send('setStore', 'config.theme', theme)
    })
  }

  toggleShowLeading() {
    window.electron.ipcRenderer.send('toggleShowLeading')
  }

  setConfig<T extends keyof typeof this.config>(key: T, value: typeof this.config[T]) {
    this.config[key] = value
    ipcRenderer.send('setStore', `config.${key}`, value)
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
    await MainApi.getPath('home').then(res => {
      this.homePath = res
      if (this.mas) {
        const m = this.homePath.match(/\/Users\/[^\/]+/)
        if (m) this.homePath = m[0]
      }
    })
    return new Promise(resolve => {
      window.electron.ipcRenderer.invoke('getConfig').then(action(res => {
        if (res.dark) document.documentElement.classList.add('dark')
        this.config = {
          ...this.config,
          ...res
        }
        localStorage.setItem('theme', this.config.dark ? 'dark' : 'light')
        if (this.config.dark) {
          mermaid.initialize({
            theme: 'dark'
          })
        }
        document.body.classList.add('font-' + this.config.interfaceFont)
        resolve(true)
      }))
      shareStore.initial()
    })
  }
}

export const configStore = new ConfigStore()
