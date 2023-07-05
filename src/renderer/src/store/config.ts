import {action, makeAutoObservable, runInAction} from 'mobx'
import {MainApi} from '../api/main'
import {ipcRenderer} from 'electron'
import mermaid from 'mermaid'

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
    leadingLevel: 4
  }
  timer = 0
  constructor() {
    makeAutoObservable(this, {
      timer: false
    })
    window.electron.ipcRenderer.on('openSet', () => {
      this.initial()
      runInAction(() => {
        this.visible = true
      })
    })
    window.electron.ipcRenderer.on('changeConfig',  action((e, key: any, value: any) => {
      this.config[key] = value
      if (['codeLineNumber', 'codeTabSize', 'codeTheme'].includes(key)) this.syncConfig()
    }))
  }
  private syncConfig() {
    clearTimeout(this.timer)
    this.timer = window.setTimeout(() => {
      MainApi.getServerConfig().then(async res => {
        if (res) {
          const sdk = new window.api.sdk()
          try {
            await sdk.uploadFileByText('config.json', JSON.stringify({
              codeTheme: this.config.codeTheme,
              codeTabSize: this.config.codeTabSize,
              codeLineNumber: this.config.codeLineNumber
            }))
          } catch (e) {
            console.error('set share config fail')
          } finally {
            sdk.dispose()
          }
        }
      })
    }, 3000)
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
      window.electron.ipcRenderer.send('setStore', 'config.theme', theme)
    })
  }
  toggleShowLeading() {
    window.electron.ipcRenderer.send('toggleShowLeading')
  }
  setConfig<T extends keyof typeof this.config>(key: T, value: typeof this.config[T]) {
    this.config[key] = value
    ipcRenderer.send('setStore', `config.${key}`, value)
    if (['codeLineNumber', 'codeTabSize', 'codeTheme'].includes(key)) this.syncConfig()
  }
  initial() {
    return new Promise(resolve => {
      window.electron.ipcRenderer.invoke('getConfig').then(action(res => {
        if (res.dark) document.documentElement.classList.add('dark')
        this.config = {
          ...this.config,
          ...res
        }
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
