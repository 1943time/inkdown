import { createContext, useContext } from 'react'
import { ChatStore } from './chat'
import { ModelApi } from './api/api'
import { MessageInstance } from 'antd/es/message/interface'
import { SettingsStore } from './settings'
import { NoteStore } from './note/note'
import { mediaType } from '@/editor/utils/dom'
import { ContextMenu } from './menu'
import { SystemApi } from './api/system'
import { LocalFile } from './note/local'
import { MarkdownOutput } from './note/output'
import { WorkerHandle } from './note/worker/handle'
import { ImportNote } from './note/import'
import { KeyboardStore } from './keyboard'
import { HookAPI } from 'antd/es/modal/useModal'
export class Store {
  public readonly model = new ModelApi(this)
  public readonly settings = new SettingsStore(this)
  public readonly chat = new ChatStore(this)
  public readonly note = new NoteStore(this)
  public readonly menu = new ContextMenu(this)
  public readonly system = new SystemApi()
  public readonly local = new LocalFile(this)
  public readonly output = new MarkdownOutput(this)
  public readonly worker = new WorkerHandle(this)
  public readonly import = new ImportNote(this)
  public readonly keyboard = new KeyboardStore(this)
  public readonly msg: MessageInstance
  public readonly modal: HookAPI
  userDataPath = ''
  constructor(api: { msg?: MessageInstance; modal?: HookAPI }) {
    this.msg = api.msg!
    this.modal = api.modal!
    this.system.userDataPath().then((path) => {
      this.userDataPath = path
    })
  }
  copySuccessfully(str: string, message?: string) {
    this.copy(str)
    this.msg.open({
      type: 'success',
      content: message || 'Copied to clipboard'
    })
  }
  copy(text: string) {
    window.api.writeToClipboard(text)
  }
  async getRemoteMediaType(url: string) {
    if (!url) return 'other'
    try {
      const type = mediaType(url)
      if (type !== 'other') return type
      let contentType = ''
      const controller = new AbortController()
      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'cors'
      })
      if (!res.ok) {
        throw new Error()
      }
      setTimeout(() => {
        controller.abort()
      }, 1000)
      contentType = res.headers.get('content-type') || ''
      return contentType.split('/')[0]
    } catch (e) {
      return null
    }
  }
}

export const StoreContext = createContext<Store>({} as any)

export const useStore = () => {
  return useContext(StoreContext)
}
