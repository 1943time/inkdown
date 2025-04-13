import { Store } from './store'
import { AiMode, IClient } from 'types/model'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type ClientModel = {
  id: string
  mode: AiMode
  model: string
  apiKey?: string
  baseUrl?: string
  options?: Record<string, any>
}
export class SettingsStore {
  useState = create(
    immer(() => ({
      open: false,
      fold: false,
      window: 'chat' as 'chat' | 'note',
      defaultModel: null as ClientModel | null,
      models: [] as IClient[],
      ready: false,
      reduceFileName: 'false',
      sidePanelWidth: 300,
      tab: 'model',
      editorWidth: '720',
      editorFontSize: '16',
      spellCheck: 'false'
    }))
  )
  constructor(private readonly store: Store) {
    this.init()
  }
  async init() {
    await this.getModels()
    const settings = await this.store.model.getSettings(['sidePanelWidth'])
    if (settings.length) {
      this.useState.setState({ sidePanelWidth: +settings[0].value || 300 })
    }
    this.useState.setState({ ready: true })
  }
  close() {
    this.useState.setState({ open: false })
  }
  open(opts?: { tab?: 'model'; clientId?: string }) {
    this.useState.setState({ open: true })
  }
  async getModels() {
    const models = await this.store.model.getClients()
    this.useState.setState({ models })
    await this.getDefaultModel()
    return models
  }
  async getDefaultModel(force = false) {
    const { defaultModel, models } = this.useState.getState()
    const setState = this.useState.setState
    if (defaultModel && !force) {
      return defaultModel
    }
    const data = await this.store.model.getSettings(['defaultModel'])
    if (data.length) {
      const [id, model] = (data[0].value as string).split('::')
      const config = this.useState.getState().models.find((item) => item.id === id)
      if (config) {
        setState({
          defaultModel: {
            id,
            mode: config.mode as AiMode,
            model: model,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            options: config.options
          }
        })
        return this.useState.getState().defaultModel
      }
    }
    if (models.length) {
      const first = models[0]
      setState({
        defaultModel: {
          id: first.id,
          mode: first.mode as AiMode,
          model: first.models[0],
          apiKey: first.apiKey,
          baseUrl: first.baseUrl,
          options: first.options
        }
      })
    }
    return this.useState.getState().defaultModel
  }
  async removeModel(id: string) {
    this.useState.setState((state) => {
      state.models = state.models.filter((item) => item.id !== id)
    })
    await this.store.model.deleteClient(id)
    const activeChat = this.store.chat.useState.getState().activeChat
    if (activeChat?.clientId === id) {
      const data = this.getAvailableUseModel()
      if (data) {
        this.store.chat.setChatModel(data.id, data.model)
      }
    }
  }

  getAvailableUseModel(id?: string, model?: string): ClientModel {
    const { models, defaultModel } = this.useState.getState()
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
    return defaultModel!
  }
  async setDefaultModel(id: string, model: string) {
    await this.store.model.putSetting({ key: 'defaultModel', value: `${id}::${model}` })
    return this.getDefaultModel(true)
  }
}
