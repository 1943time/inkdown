import { ipcMain } from 'electron'
import { initModel, knex } from './model'
import { IChat, IMessage, ISetting, IClient } from 'types/model'

export const modelReady = () => {
  return initModel()
}

ipcMain.handle('getPrompts', async () => {
  const prompts = await knex.select('*').from('prompt')
  return prompts
})

ipcMain.handle('getChats', async () => {
  const chats = await knex.select('*').from('chat')
  return chats
})

ipcMain.handle('getChat', async (_, id: string) => {
  const chat = await knex.select('*').from('chat').where('id', id).first()
  if (chat) {
    chat.messages = await knex.select('*').from('message').where('chatId', id)
  }
  return chat
})

ipcMain.handle('createChat', async (_, chat: IChat) => {
  const newChat = await knex.insert(chat).into('chat')
  return newChat
})

ipcMain.handle('updateChat', async (_, id: string, chat: Partial<IChat>) => {
  const updatedChat = await knex('chat').where({ id }).update(chat)
  return updatedChat
})

ipcMain.handle('deleteChat', async (_, id: string) => {
  return knex.transaction(async (trx) => {
    await trx.delete().from('message').where('chatId', id)
    await trx.delete().from('chat').where('id', id)
  })
})

ipcMain.handle('createMessages', async (_, messages: IMessage[]) => {
  const newMessages = await knex.batchInsert('message', messages)
  return newMessages
})

ipcMain.handle('updateMessage', async (_, id: string, message: Partial<IMessage>) => {
  const updatedMessage = await knex('message').where({ id }).update(message)
  return updatedMessage
})

ipcMain.handle('deleteMessages', async (_, ids: string[]) => {
  return knex('message').whereIn('id', ids).delete()
})

ipcMain.handle('getMessages', async (_, chatId: string) => {
  const messages = await knex.select('*').from('message').where('chatId', chatId)
  return messages
})

ipcMain.handle('putSetting', async (_, setting: ISetting) => {
  const row = await knex('setting').where('key', setting.key).first()
  if (row) {
    return knex('setting').where('key', setting.key).update({ value: setting.value })
  }
  return knex('setting').insert(setting)
})

ipcMain.handle('getSetting', async (_, key: string) => {
  const setting = await knex('setting').where('key', key).first()
  return setting
})

ipcMain.handle('deleteSetting', async (_, key: string) => {
  return knex('setting').where('key', key).delete()
})

ipcMain.handle('getSettings', async (_, keys?: string[]) => {
  if (keys) {
    return knex.select('*').from('setting').whereIn('key', keys)
  }
  return knex.select('*').from('setting')
})

ipcMain.handle('getClients', async () => {
  const clients = await knex.select('*').from('client')
  return clients
})

ipcMain.handle('getClient', async (_, id: string) => {
  const client = await knex.select('*').from('client').where('id', id).first()
  return client
})

ipcMain.handle('createClient', async (_, client: IClient) => {
  const newClient = await knex.insert(client).into('client')
  return newClient
})

ipcMain.handle('updateClient', async (_, id: string, client: Partial<IClient>) => {
  const updatedClient = await knex('client').where({ id }).update(client)
  return updatedClient
})

ipcMain.handle('deleteClient', async (_, id: string) => {
  return knex.delete().from('client').where('id', id)
})
