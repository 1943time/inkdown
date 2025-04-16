import { dataTransform, stringTransform } from '@/utils/common'
import {
  IChat,
  IChatTable,
  IClient,
  IDoc,
  IDocTag,
  IFile,
  IHistory,
  IMessage,
  IPrompt,
  ISetting,
  ISpace,
  ITag
} from 'types/model'
// 使用系统api
const ipcRenderer = window.electron.ipcRenderer
export class ModelApi {
  async getChats(): Promise<IChatTable[]> {
    return ipcRenderer.invoke('getChats')
  }

  async getChat(id: string): Promise<IChat | null> {
    return ipcRenderer.invoke('getChat', id)
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
    return ipcRenderer.invoke('createMessages', messages)
  }

  async updateMessage(id: string, message: Partial<IMessage>): Promise<void> {
    return ipcRenderer.invoke('updateMessage', id, message)
  }

  async deleteMessages(ids: string[]): Promise<void> {
    return ipcRenderer.invoke('deleteMessages', ids)
  }

  async getMessages(chatId: string): Promise<IMessage[]> {
    return ipcRenderer.invoke('getMessages', chatId)
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

  async getSpace(id: string): Promise<ISpace | null> {
    return ipcRenderer.invoke('getSpace', id)
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
        return {
          ...d,
          links: d.links ? JSON.parse(d.links as unknown as string) : [],
          schema: d.schema ? JSON.parse(d.schema as unknown as string) : []
        }
      })
    })
  }

  async getDocsByParentId(parentId: string): Promise<IDoc[]> {
    return ipcRenderer.invoke('getDocsByParentId', parentId)
  }

  async clearDocs(spaceId: string, ids: string[]): Promise<void> {
    return ipcRenderer.invoke('clearDocs', spaceId, ids)
  }

  async createDoc(doc: IDoc): Promise<void> {
    return ipcRenderer.invoke('createDoc', doc)
  }

  async updateDoc(id: string, doc: Partial<IDoc>): Promise<void> {
    return ipcRenderer.invoke('updateDoc', id, doc)
  }

  async updateDocs(docs: Partial<IDoc>[]): Promise<void> {
    return ipcRenderer.invoke('updateDocs', docs)
  }

  async deleteDoc(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteDoc', id)
  }

  async getDoc(id: string): Promise<IDoc | null> {
    return ipcRenderer.invoke('getDoc', id)
  }

  async createDocTag(docTag: IDocTag): Promise<void> {
    return ipcRenderer.invoke('createDocTag', docTag)
  }

  async deleteDocTag(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteDocTag', id)
  }

  async getDocTags(docId: string): Promise<ITag[]> {
    return ipcRenderer.invoke('getDocTags', docId)
  }

  async createTag(tag: ITag): Promise<void> {
    return ipcRenderer.invoke('createTag', tag)
  }

  async deleteTag(id: string): Promise<void> {
    return ipcRenderer.invoke('deleteTag', id)
  }

  async getTags(): Promise<ITag[]> {
    return ipcRenderer.invoke('getTags')
  }

  async getHistory(docId: string): Promise<IHistory[]> {
    return ipcRenderer.invoke('getHistory', docId)
  }

  async createHistory(history: IHistory): Promise<void> {
    return ipcRenderer.invoke('createHistory', history)
  }

  async clearHistory(docId: string): Promise<void> {
    return ipcRenderer.invoke('clearHistory', docId)
  }

  async getFiles(spaceId: string): Promise<IFile[]> {
    return ipcRenderer.invoke('getFiles', spaceId)
  }

  async createFile(file: IFile): Promise<void> {
    return ipcRenderer.invoke('createFile', file)
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
}
