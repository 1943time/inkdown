import { ipcMain, app } from 'electron'
import { initModel, knex } from './model'
import {
  IChat,
  IMessage,
  ISetting,
  IClient,
  ISpace,
  IDoc,
  IDocTag,
  ITag,
  IHistory,
  IFile
} from 'types/model'
import { omit } from '../utils'
import { join } from 'path'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { nanoid } from 'nanoid'

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
        error: m.error ? JSON.stringify(m.error) : null
        // docs: m.docs ? JSON.stringify(m.docs) : null
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

ipcMain.handle('getSpaces', async () => {
  let spaces = await knex.select('*').orderBy('sort', 'asc').from('space')
  if (spaces.length === 0) {
    await knex('space').insert({
      id: nanoid(),
      name: 'My Space',
      sort: 0
    })
    spaces = await knex.select('*').orderBy('sort', 'asc').from('space')
  }
  return spaces
})

ipcMain.handle(
  'getSpace',
  async (
    _,
    opt: {
      id?: string
      name?: string
      writeFolderPath?: string
    }
  ) => {
    return knex.select('*').from('space').where(opt).first()
  }
)

ipcMain.handle('createSpace', async (_, space: ISpace) => {
  return knex('space').insert(space)
})

ipcMain.handle('updateSpace', async (_, id: string, space: Partial<ISpace>) => {
  return knex('space').where('id', id).update(space)
})

ipcMain.handle('sortSpaces', async (_, ids: string[]) => {
  return Promise.all(
    ids.map((id, index) => {
      return knex('space').where('id', id).update({ sort: index, updated: Date.now() })
    })
  )
})

ipcMain.handle('deleteSpace', async (_, id: string) => {
  return knex.transaction(async (trx) => {
    const docs = await trx('doc').where('spaceId', id).select(['id'])
    await trx('docTag')
      .whereIn(
        'docId',
        docs.map((d) => d.id)
      )
      .delete()
    await trx('history')
      .whereIn(
        'docId',
        docs.map((d) => d.id)
      )
      .delete()
    await trx('doc').where('spaceId', id).delete()
    await trx('space').where('id', id).delete()
    const files = await trx('file').where('spaceId', id).select(['name'])
    // 删除缓存区
    const assetsPath = join(app.getPath('userData'), 'assets')
    for (const file of files) {
      try {
        const filePath = join(assetsPath, file.name)
        if (existsSync(filePath)) {
          await unlink(filePath)
        }
      } catch (e) {
        console.error(e)
      }
    }
    await trx('file').where('spaceId', id).delete()
  })
})

ipcMain.handle('getDocs', async (_, spaceId: string, deleted?: boolean) => {
  const handle = knex('doc').where('spaceId', spaceId)
  handle.andWhere('deleted', !!deleted)
  const docs = await handle.orderBy('sort', 'asc').select('*')
  return docs
})

ipcMain.handle('clearDocs', async (_, spaceId: string, ids: string[]) => {
  return knex('doc').where('spaceId', spaceId).whereIn('id', ids).delete()
})

ipcMain.handle('getDocsByParentId', async (_, parentId: string) => {
  const docs = await knex('doc').where('parentId', parentId).orderBy('sort', 'asc').select('*')
  return docs
})

ipcMain.handle('createDoc', async (_, doc: IDoc) => {
  return knex('doc').insert(omit(doc, ['expand', 'children']))
})

ipcMain.handle('updateDoc', async (_, id: string, doc: Partial<IDoc>) => {
  return knex('doc')
    .where('id', id)
    .update(omit(doc, ['expand', 'children', 'id']))
})

ipcMain.handle('updateDocs', async (_, docs: Partial<IDoc>[]) => {
  return Promise.all(
    docs.map((d) => {
      return knex('doc')
        .where('id', d.id!)
        .update(omit(d, ['id', 'expand', 'children']))
    })
  )
})

ipcMain.handle('deleteDoc', async (_, id: string) => {
  return knex('doc').where('id', id).update({ deleted: 1 })
})

ipcMain.handle('getDoc', async (_, id: string) => {
  const doc = await knex('doc').where('id', id).first()
  return doc
})

ipcMain.handle('createDocTag', async (_, docTag: IDocTag) => {
  return knex('docTag').insert(docTag)
})

ipcMain.handle('deleteDocTag', async (_, id: string) => {
  return knex('docTag').where('id', id).delete()
})

ipcMain.handle('getDocTags', async (_, docId: string) => {
  const docTags = await knex('docTag')
    .join('tag', 'docTag.tagId', '=', 'tag.id')
    .where('docId', docId)
    .select(['tag.id', 'tag.name'])
  return docTags
})

ipcMain.handle('createTag', async (_, tag: ITag) => {
  return knex('tag').insert(tag)
})

ipcMain.handle('deleteTag', async (_, id: string) => {
  return knex.transaction(async (trx) => {
    await trx('docTag').where('tagId', id).delete()
    await trx('tag').where('id', id).delete()
  })
})

ipcMain.handle('getTags', async () => {
  const tags = await knex('tag').select('*')
  return tags
})

ipcMain.handle('getHistory', async (_, docId: string) => {
  const history = await knex('history').where('docId', docId).select(['id', 'created'])
  return history
})

ipcMain.handle('createHistory', async (_, history: IHistory) => {
  return knex('history').insert(history)
})

ipcMain.handle('clearHistory', async (_, docId: string) => {
  return knex('history').where('docId', docId).delete()
})

ipcMain.handle('getFiles', async (_, spaceId: string) => {
  const files = await knex('file')
    .where('spaceId', spaceId)
    .orderBy('created', 'desc')
    .select(['id', 'name', 'created', 'size'])
  return files
})

ipcMain.handle('createFile', async (_, file: IFile) => {
  return knex('file').insert(file)
})

ipcMain.handle('deleteFiles', async (_, ids: string[]) => {
  const files = await knex('file').whereIn('id', ids).select(['name'])
  const assetsPath = join(app.getPath('userData'), 'assets')
  for (const file of files) {
    try {
      const filePath = join(assetsPath, file.name)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (e) {
      console.error(e)
    }
  }
  return knex('file').whereIn('id', ids).delete()
})

ipcMain.handle('getFileAssetPath', async (_) => {
  return join(app.getPath('userData'), 'assets')
})

ipcMain.handle(
  'findDocName',
  async (
    _,
    data: {
      spaceId: string
      name: string
      parentId?: string
    }
  ) => {
    return await knex('doc')
      .where({
        spaceId: data.spaceId,
        parentId: data.parentId,
        name: data.name
      })
      .count('id', { as: 'count' })
      .then((res) => res[0].count)
  }
)
