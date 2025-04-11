import { ipcMain } from 'electron'
import { initModel, knex } from './model'
import { IChat, IMessage, ISetting, IClient } from 'types/model'
import { omit } from '../utils'

export const modelReady = () => {
  return initModel()
}

ipcMain.handle('getPrompts', async () => {
  const prompts = await knex.select('*').from('prompt')
  return prompts
})

ipcMain.handle('getChats', async () => {
  const chats = await knex.select('*').from('chat')
  return chats.map((chat) => {
    return {
      ...chat,
      websearch: chat.websearch === 1,
      messages: []
    }
  })
})

ipcMain.handle('getChat', async (_, id: string) => {
  const chat = await knex.select('*').from('chat').where('id', id).first()
  if (chat) {
    const messages = await knex.select('*').from('message').where('chatId', id)
    chat.messages = messages.map((m) => {
      return {
        ...m,
        files: m.files ? JSON.parse(m.files) : null,
        images: m.images ? JSON.parse(m.images) : null,
        error: m.error ? JSON.parse(m.error) : null
      }
    })
  }
  return {
    ...chat,
    websearch: chat.websearch === 1
  }
})

ipcMain.handle('createChat', async (_, chat: IChat) => {
  const newChat = await knex.insert(omit(chat, ['messages', 'pending'])).into('chat')
  return newChat
})

ipcMain.handle('updateChat', async (_, id: string, chat: Partial<IChat>) => {
  const updatedChat = await knex('chat')
    .where({ id })
    .update(omit(chat, ['messages', 'pending']))
  return updatedChat
})

ipcMain.handle('deleteChat', async (_, id: string) => {
  return knex.transaction(async (trx) => {
    await trx.delete().from('message').where('chatId', id)
    await trx.delete().from('chat').where('id', id)
  })
})

ipcMain.handle('createMessages', async (_, messages: IMessage[]) => {
  return knex('message').insert(
    messages.map((m) => {
      return {
        ...m,
        files: m.files ? JSON.stringify(m.files) : null,
        images: m.images ? JSON.stringify(m.images) : null,
        error: m.error ? JSON.stringify(m.error) : null,
        docs: m.docs ? JSON.stringify(m.docs) : null
      }
    })
  )
})

ipcMain.handle('updateMessage', async (_, id: string, message: Partial<IMessage>) => {
  const updateData: any = {
    ...message
  }
  if (message.files) {
    updateData.files = JSON.stringify(message.files)
  }
  if (message.images) {
    updateData.images = JSON.stringify(message.images)
  }
  if (message.error) {
    updateData.error = JSON.stringify(message.error)
  }
  if (message.docs) {
    updateData.docs = JSON.stringify(message.docs)
  }
  const updatedMessage = await knex('message').where({ id }).update(updateData)
  return updatedMessage
})

ipcMain.handle('deleteMessages', async (_, ids: string[]) => {
  return knex('message').whereIn('id', ids).delete()
})

ipcMain.handle('getMessages', async (_, chatId: string) => {
  const messages = await knex.select('*').from('message').where('chatId', chatId)
  return messages.map((m) => {
    return {
      ...m,
      files: m.files ? JSON.parse(m.files) : null,
      images: m.images ? JSON.parse(m.images) : null,
      error: m.error ? JSON.parse(m.error) : null,
      docs: m.docs ? JSON.parse(m.docs) : null
    }
  })
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
  return clients.map((client) => {
    return {
      ...client,
      models: client.models ? JSON.parse(client.models) : [],
      options: client.options ? JSON.parse(client.options) : {}
    }
  })
})

ipcMain.handle('getClient', async (_, id: string) => {
  const client = await knex.select('*').from('client').where('id', id).first()
  if (client) {
    return {
      ...client,
      models: client.models ? JSON.parse(client.models) : [],
      options: client.options ? JSON.parse(client.options) : {}
    }
  }
  return null
})

ipcMain.handle('createClient', async (_, client: IClient) => {
  return knex('client').insert({
    ...client,
    models: JSON.stringify(client.models || []),
    options: JSON.stringify(client.options || {})
  })
})

ipcMain.handle('updateClient', async (_, id: string, client: Partial<IClient>) => {
  const updatedClient = await knex('client').where({ id }).update(client)
  const updateData: any = {
    ...client
  }
  if (client.models) {
    updateData.models = JSON.stringify(client.models)
  }
  if (client.options) {
    updateData.options = JSON.stringify(client.options)
  }
  knex('client').where({ id }).update(updateData)
  return updatedClient
})

ipcMain.handle('deleteClient', async (_, id: string) => {
  return knex.delete().from('client').where('id', id)
})
