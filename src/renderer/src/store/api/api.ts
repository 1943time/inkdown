import { IChat, IChatTable, IClient, IMessage, IPrompt, ISetting } from 'types/model'
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
    return ipcRenderer.invoke('putSetting', setting)
  }

  async getSetting(key: string): Promise<ISetting | null> {
    return ipcRenderer.invoke('getSetting', key)
  }

  async deleteSetting(key: string): Promise<void> {
    return ipcRenderer.invoke('deleteSetting', key)
  }

  async getSettings(keys?: string[]): Promise<ISetting[]> {
    return ipcRenderer.invoke('getSettings', keys)
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
}
