import { Store } from './store'
import { AiMode, IClient } from 'types/model'
import { StructStore } from './struct'
import { Subject } from 'rxjs'
import { isDark } from '@/utils/common'

const state = {
  open: false,
  fold: false,
  view: 'chat' as 'chat' | 'note',
  defaultModel: null as { providerId: string; model: string } | null,
  models: [] as IClient[],
  ready: false,
  reduceFileName: false,
  sidePanelWidth: 300,
  tab: 'model',
  editorFontSize: 16,
  theme: 'dark' as 'system' | 'light' | 'dark',
  systemDark: isDark(),
  editorWidth: 720,
  spellCheck: false,
  codeAutoBreak: false,
  codeTabSize: 2,
  get dark() {
    return this.theme === 'system' ? this.systemDark : this.theme === 'dark'
  },
  get model() {
    if (this.defaultModel) {
      const model = this.models.find((item) => item.id === this.defaultModel!.providerId)
      if (model) {
        return {
          id: model.id,
          mode: model.mode as AiMode,
          model: model.models?.includes(this.defaultModel!.model)
            ? this.defaultModel!.model
            : model.models[0],
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          options: model.options
        } as ClientModel
      }
    }
    const data = this.models[0]
    if (data) {
      return {
        id: data.id,
        mode: data.mode as AiMode,
        model: data.models[0],
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        options: data.options
      } as ClientModel
    }
    return null
  }
}
export type ClientModel = {
  id: string
  mode: AiMode
  model: string
  apiKey?: string
  baseUrl?: string
  options?: Record<string, any>
}
export class SettingsStore extends StructStore<typeof state> {
  darkChanged$ = new Subject<boolean>()
  private callbacks: Function[] = []
  constructor(private readonly store: Store) {
    super(state)
    this.init()
    try {
      const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)')
      setTimeout(() => {
        darkModePreference.addEventListener('change', (e) => {
          this.setState({
            systemDark: e.matches
          })
        })
      }, 1000)
    } catch (e) {
      console.error(e)
    }
  }
  async init() {
    await this.getModels()
    const settings = await this.store.model.getSettings()
    await this.getModels()
    this.setState((state) => {
      for (const key of Object.keys(state)) {
        const value = settings[key]
        if (value !== undefined) {
          state[key] = value
        }
      }
    })
    this.setState({ ready: true })
    if (this.callbacks.length) {
      for (const callback of this.callbacks) {
        callback()
      }
      this.callbacks = []
    }
  }
  close() {
    this.setState({ open: false })
  }
  open(opts?: { tab?: 'model'; clientId?: string }) {
    this.setState({ open: true })
  }
  async setSetting<T extends typeof state, U extends keyof T>(key: U, value: T[U]) {
    await this.store.model.putSetting({ key: key as string, value })
    this.setState((state) => {
      if (key in state) {
        // @ts-ignore
        state[key] = value
      }
    })
  }
  async getModels() {
    const models = await this.store.model.getClients()
    this.setState({ models })
    return models
  }
  async removeModel(id: string) {
    this.setState((state) => {
      state.models = state.models.filter((item) => item.id !== id)
    })
    await this.store.model.deleteClient(id)
    const activeChat = this.store.chat.state.activeChat
    if (activeChat?.clientId === id) {
      const data = this.getAvailableUseModel()
      if (data) {
        this.store.chat.setChatModel(data.id, data.model)
      }
    }
  }

  getAvailableUseModel(id?: string, model?: string): ClientModel {
    const { models } = this.state
    if (id) {
      const config = models.find((item) => item.id === id)
      if (config) {
        return {
          id: config.id,
          mode: config.mode as AiMode,
          model: model && config.models.includes(model) ? model : config.models[0],
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          options: config.options
        }
      }
    }
    return this.state.model!
  }
  async setDefaultModel(id: string, model: string) {
    this.setState({ defaultModel: { providerId: id, model } })
    await this.store.model.putSetting({ key: 'defaultModel', value: { providerId: id, model } })
  }
  async ready(callback: Function) {
    if (this.state.ready) {
      callback()
    } else {
      this.callbacks.push(callback)
    }
  }
}
