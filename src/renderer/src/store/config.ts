import {action, makeAutoObservable, runInAction} from 'mobx'
import {MainApi} from '../api/main'
import {ipcRenderer} from 'electron'
import mermaid from 'mermaid'
import {Subject} from 'rxjs'

export const login$ = new Subject<boolean>()
class ConfigStore {
  visible = false
  config = {
    showLeading: true,
    theme: 'system' as 'system' | 'dark' | 'light',
    dark: false,
    codeLineNumber: false,
    codeTabSize: 2,
    editorTextSize: 16,
    codeTheme: 'material-theme-palenight',
    leadingLevel: 4,
    locale: 'en' as 'en' | 'zh',
    showCharactersCount: true,
    titleColor: undefined as undefined | 'h-emerald' | 'h-indigo' | 'h-amber',
    mas: false,
    token: ''
  }
  masUpdate = false
  locale = 'en'
  timer = 0
  get isZh() {
    return this.locale === 'zh'
  }
  get isLogin() {
    return !!this.config.token
  }
  constructor() {
    makeAutoObservable(this, {
      timer: false,
      locale: false
    })
    window.electron.ipcRenderer.on('openSet', () => {
      this.initial()
      runInAction(() => {
        this.visible = true
      })
    })
    window.electron.ipcRenderer.on('changeConfig',  action((e, key: any, value: any) => {
      this.config[key] = value
    }))
  }
  async setTheme(theme: typeof this.config.theme) {
    const dark = await MainApi.getSystemDark()
    runInAction(() => {
      this.config.theme = theme
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
    if (key === 'token' && value) login$.next(true)
    ipcRenderer.send('setStore', `config.${key}`, value)
  }
  checkMasUpdate() {
    // window.api.checkedLatest().then(res => {
    //   console.log('res', res)
    // })
  }
  initial() {
    return new Promise(resolve => {
      window.electron.ipcRenderer.invoke('getConfig').then(action(res => {
        // console.log('res', res)
        if (res.dark) document.documentElement.classList.add('dark')
        this.config = {
          ...this.config,
          ...res
        }
        if (this.config.token) login$.next(true)
        this.checkMasUpdate()
        localStorage.setItem('theme', this.config.dark ? 'dark' : 'light')
        if (this.config.dark) {
          mermaid.initialize({
            theme: 'dark'
          })
        }
        resolve(true)
      }))
    })
  }
}

export const configStore = new ConfigStore()
