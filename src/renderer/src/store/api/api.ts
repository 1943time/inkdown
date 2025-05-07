import { copy, dataTransform, stringTransform } from '@/utils/common'
import {
  IChat,
  IChatTable,
  IClient,
  IDoc,
  IFile,
  IHistory,
  IMessage,
  IPrompt,
  ISetting,
  ISpace
} from 'types/model'
const ipcRenderer = window.electron.ipcRenderer
export class ModelApi {
  private transformDoc(doc: IDoc): IDoc {
    return {
      ...doc,
      folder: Boolean(doc.folder),
      links: doc.links ? JSON.parse(doc.links as unknown as string) : [],
      medias: doc.medias ? JSON.parse(doc.medias as unknown as string) : [],
      schema: doc.schema ? JSON.parse(doc.schema as unknown as string) : undefined
    }
  }
  private serializeDoc(doc: Partial<IDoc>) {
    return {
      ...doc,
      schema: doc.schema ? JSON.stringify(doc.schema) : undefined,
      links: doc.links ? JSON.stringify(doc.links) : undefined,
      medias: doc.medias ? JSON.stringify(doc.medias) : undefined
    }
  }
  async getChats(): Promise<IChatTable[]> {
    return ipcRenderer.invoke('getChats')
  }

  async getChat(id: string): Promise<IChat | null> {
    return ipcRenderer.invoke('getChat', id).then((chat: any) => {
      return {
        ...chat,
        messages: chat.messages
          ? chat.messages.map((m: any) => {
              return {
                ...m,
                files: m.files ? JSON.parse(m.files) : [],
                context: m.context ? JSON.parse(m.context) : [],
                docs: m.docs ? JSON.parse(m.docs) : []
              }
            })
          : []
      }
    })
  }

  async createChat(chat: IChat): Promise<void> {
    return ipcRenderer.invoke('createChat', chat)
  }

  async updateChat(id: string, chat: Partial<IChat>): Promise<void> {
    return ipcRenderer.invoke('updateChat', id, chat)
  }

  async deleteChat(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteChat', id)
  }

  async createMessages(messages: IMessage[]): Promise<void> {
    return ipcRenderer.invoke(
      'createMessages',
      messages.map((m) => {
        return {
          ...m,
          context: typeof m.context === 'string' ? m.context : JSON.stringify(m.context),
          docs: typeof m.docs === 'string' ? m.docs : JSON.stringify(m.docs),
          files: typeof m.files === 'string' ? m.files : JSON.stringify(m.files)
        }
      })
    )
  }
  async updateMessage(id: string, message: Partial<IMessage>): Promise<void> {
    return ipcRenderer.invoke('updateMessage', id, {
      ...message,
      context:
        typeof message.context === 'string' ? message.context : JSON.stringify(message.context),
      docs: typeof message.docs === 'string' ? message.docs : JSON.stringify(message.docs),
      files: typeof message.files === 'string' ? message.files : JSON.stringify(message.files)
    })
  }

  async deleteMessages(ids: string[]): Promise<void> {
    return ipcRenderer.invoke('deleteMessages', ids)
  }

  async getMessages(chatId: string): Promise<IMessage[]> {
    return ipcRenderer.invoke('getMessages', chatId).then((messages: any[]) => {
      return messages.map((m) => {
        return {
          ...m,
          docs: m.docs ? JSON.parse(m.docs) : [],
          files: m.files ? JSON.parse(m.files) : [],
          context: m.context ? JSON.parse(m.context) : []
        }
      })
    })
  }

  async getPrompts(): Promise<IPrompt[]> {
    return ipcRenderer.invoke('getPrompts')
  }

  async putSetting(setting: ISetting): Promise<void> {
    return ipcRenderer.invoke('putSetting', {
      ...setting,
      value: stringTransform(setting.value)
    })
  }

  async getSetting(key: string): Promise<ISetting | null> {
    return ipcRenderer.invoke('getSetting', key).then((setting) => {
      if (setting) {
        return { ...setting, value: dataTransform(setting.value) }
      }
      return null
    })
  }

  async deleteSetting(key: string): Promise<void> {
    return ipcRenderer.invoke('deleteSetting', key)
  }

  async getSettings(keys?: string[]): Promise<any> {
    return ipcRenderer.invoke('getSettings', keys).then((settings: ISetting[]) => {
      return Object.fromEntries(
        settings.map((s) => {
          return [s.key, dataTransform(s.value)]
        })
      )
    })
  }
  async getClients(): Promise<IClient[]> {
    return ipcRenderer.invoke('getClients')
  }

  async getClient(id: string): Promise<IClient | null> {
    return ipcRenderer.invoke('getClient', id)
  }

  async createClient(client: IClient): Promise<void> {
    return ipcRenderer.invoke('createClient', client)
  }

  async updateClient(id: string, client: Partial<IClient>): Promise<void> {
    return ipcRenderer.invoke('updateClient', id, client)
  }

  async deleteClient(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteClient', id)
  }
  async getSpaces(): Promise<ISpace[]> {
    return ipcRenderer.invoke('getSpaces')
  }

  async sortSpaces(ids: string[]): Promise<void> {
    return ipcRenderer.invoke('sortSpaces', ids)
  }

  async getSpace(opts: {
    id?: string
    name?: string
    writeFolderPath?: string
  }): Promise<ISpace | null> {
    return ipcRenderer.invoke('getSpace', opts)
  }

  async createSpace(space: ISpace): Promise<void> {
    return ipcRenderer.invoke('createSpace', space)
  }

  async updateSpace(id: string, space: Partial<ISpace>): Promise<void> {
    return ipcRenderer.invoke('updateSpace', id, space)
  }

  async deleteSpace(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteSpace', id)
  }

  async getDocs(spaceId: string, deleted?: boolean): Promise<IDoc[]> {
    return ipcRenderer.invoke('getDocs', spaceId, deleted).then((docs: IDoc[]) => {
      return docs.map((d) => {
        return this.transformDoc(d)
      })
    })
  }

  async getDocsByParentId(parentId: string): Promise<IDoc[]> {
    return ipcRenderer.invoke('getDocsByParentId', parentId).then((docs: IDoc[]) => {
      return docs.map((d) => {
        return this.transformDoc(d)
      })
    })
  }

  async clearDocs(spaceId: string, ids: string[]): Promise<void> {
    return ipcRenderer.invoke('clearDocs', spaceId, ids)
  }

  async createDoc(doc: IDoc): Promise<void> {
    return ipcRenderer.invoke('createDoc', this.serializeDoc(doc))
  }

  async updateDoc(
    id: string,
    doc: Partial<IDoc>,
    ctx?: { texts?: string; chunks?: { text: string; path: number; type: string }[] }
  ): Promise<void> {
    console.log('ctx', ctx)

    return ipcRenderer.invoke('updateDoc', id, this.serializeDoc(doc), ctx)
  }

  async updateDocs(docs: Partial<IDoc>[]): Promise<void> {
    return ipcRenderer.invoke(
      'updateDocs',
      docs.map((d) => {
        return this.serializeDoc(d)
      })
    )
  }

  async deleteDoc(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteDoc', id)
  }

  async getDoc(id: string): Promise<IDoc | null> {
    return ipcRenderer.invoke('getDoc', id).then((doc) => {
      return this.transformDoc(doc)
    })
  }

  async getHistory(docId: string): Promise<IHistory[]> {
    return ipcRenderer.invoke('getHistory', docId)
  }

  async createHistory(history: IHistory): Promise<void> {
    return ipcRenderer.invoke('createHistory', copy(history))
  }

  async clearHistory(docId: string): Promise<void> {
    return ipcRenderer.invoke('clearHistory', docId)
  }

  async getFiles(spaceId: string): Promise<IFile[]> {
    return ipcRenderer.invoke('getFiles', spaceId)
  }

  async createFile(file: IFile): Promise<void> {
    return ipcRenderer.invoke('createFile', copy(file))
  }

  async deleteFiles(ids: string[]): Promise<void> {
    return ipcRenderer.invoke('deleteFiles', ids)
  }

  async getFileAssetPath(): Promise<string> {
    return ipcRenderer.invoke('getFileAssetPath')
  }
  async findDocName(data: { spaceId: string; name: string; parentId?: string }): Promise<number> {
    return ipcRenderer.invoke('findDocName', data)
  }
  async searchDocs(spaceId: string, text: string): Promise<{ docs: IDoc[]; tokens: string[] }> {
    return ipcRenderer.invoke('searchDocs', spaceId, text)
  }
  async fetchSpaceContext(
    query: string,
    spaceId: string
  ): Promise<{
    rows: { path: number; doc_id: string; space_id: string; content: string; _distance: string }[]
    ctx: { text: string; docId: string }[]
  } | null> {
    return ipcRenderer.invoke('fetchSpaceContext', { query, spaceId })
  }
}
