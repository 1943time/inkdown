import { Store } from './store'
import { AiMode, IClient } from 'types/model'
import { StructStore } from './struct'
import { Subject } from 'rxjs'
import { delayRun, isDark } from '@/utils/common'
import { observable, runInAction } from 'mobx'
import isHotkey from 'is-hotkey'
import { Editor, Element, Node, Transforms } from 'slate'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { getSystemLanguage } from '@/utils/i18n'
import i18next from 'i18next'

const data = {
  open: false,
  setTab: 1
}
const state = {
  open: false,
  foldSideBar: false,
  defaultModel: null as { providerId: string; model: string } | null,
  models: [] as IClient[],
  ready: false,
  reduceFileName: false,
  sidePanelWidth: 300,
  editorFontSize: 16,
  theme: 'system' as 'system' | 'light' | 'dark',
  systemDark: isDark(),
  autoConvertInlineFormula: false,
  editorWidth: 720,
  showHeading: true,
  headingWidth: 260,
  chatWidth: 460,
  fullChatBot: false,
  spellCheck: false,
  codeAutoBreak: false,
  maxMessageRounds: 8,
  codeTabSize: 2,
  showChatBot: false,
  language: getSystemLanguage() as 'zh' | 'en',
  modelOptions: {
    temperature: {
      value: 0.7,
      enable: false
    },
    top_p: {
      value: 0.7,
      enable: false
    },
    presence_penalty: {
      value: 0,
      enable: false
    },
    frequency_penalty: {
      value: 0,
      enable: false
    }
  },
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
  data = observable(data)
  constructor(private readonly store: Store) {
    super(state)
    this.init()
    window.addEventListener('keydown', (e) => {
      if (isHotkey('esc', e) && this.data.open) {
        this.setData((data) => {
          data.open = false
        })
      }
      if (isHotkey('mod+,', e) && !this.data.open) {
        this.setData((data) => {
          data.open = true
        })
      }
    })
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
    if (this.state.language === 'zh') {
      i18next.changeLanguage('zh')
    } else {
      i18next.changeLanguage('en')
    }
    this.setState({ ready: true })
    if (this.callbacks.length) {
      for (const callback of this.callbacks) {
        callback()
      }
      this.callbacks = []
    }
  }

  toggleChatBot() {
    if (this.state.showChatBot) {
      this.setSetting('showChatBot', false)
    } else {
      const editor = this.store.chat.editor
      const noteEditor = this.store.note.state.currentTab?.editor
      if (noteEditor) {
        const text = EditorUtils.getSelectedText(noteEditor).replace(/\n/g, ' ')
        if (text) {
          const lastLine = Node.string(editor.children[editor.children.length - 1])
          delayRun(() => {
            if (lastLine) {
              Transforms.insertNodes(editor, {
                type: 'paragraph',
                children: [{ text }]
              })
            } else {
              Transforms.insertText(editor, text, {
                at: Editor.end(editor, [editor.children.length - 1])
              })
            }
          })
        }
      }
      this.setSetting('showChatBot', true)
    }
  }
  async setSetting<T extends typeof state, U extends keyof T>(key: U, value: T[U]) {
    await this.store.model.putSetting({ key: key as string, value })
    this.setState((state) => {
      if (key in state) {
        // @ts-ignore
        state[key] = value
      }
    })
    if (key === 'theme') {
      if (this.state.dark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('theme', value as string)
      this.setCodeOptions('theme', this.state.dark ? 'cloud_editor_dark' : 'cloud_editor')
    }
    if (key === 'codeAutoBreak') {
      this.setCodeOptions('autoWrap', value)
    }
    if (key === 'codeTabSize') {
      this.setCodeOptions('tabSize', value)
    }
    if (key === 'language') {
      i18next.changeLanguage(value as string)
    }
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
    await this.setDefaultModel(undefined)
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
  async setDefaultModel(data: { providerId: string; model: string } | undefined) {
    if (data) {
      this.setState({ defaultModel: { providerId: data.providerId, model: data.model } })
      await this.store.model.putSetting({
        key: 'defaultModel',
        value: { providerId: data.providerId, model: data.model }
      })
    } else {
      const model = this.getAvailableUseModel()
      this.setState({ defaultModel: model ? { providerId: model.id, model: model.model } : null })
    }
  }
  async ready(callback: Function) {
    if (this.state.ready) {
      callback()
    } else {
      this.callbacks.push(callback)
    }
  }
  setData(ctx: (state: typeof data) => void) {
    runInAction(() => {
      ctx(this.data)
    })
  }
  setCodeOptions(type: 'theme' | 'tabSize' | 'autoWrap', value: any) {
    for (const tab of this.store.note.state.tabs) {
      const codes = Editor.nodes<any>(tab.editor, {
        at: [],
        match: (e) => Element.isElement(e) && e.type === 'code'
      })
      for (const code of codes) {
        const e = tab.codeMap.get(code[0])
        if (e) {
          if (type === 'theme') {
            e.setTheme(`ace/theme/${value}`)
          }
          if (type === 'tabSize') {
            e.setOption('tabSize', value)
          }
          if (type === 'autoWrap') {
            e.setOption('wrap', value)
          }
        }
      }
    }
  }
}
