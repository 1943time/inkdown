import { ipcMain, app } from 'electron'
import { initModel, knex } from './model'
import { IChat, IMessage, ISetting, IClient, ISpace, IDoc, IFile, IKeyboard } from 'types/model'
import { nid, omit } from '../utils'
import { join } from 'path'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import * as lancedb from '@lancedb/lancedb'
import * as arrow from 'apache-arrow'
import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers'
env.remoteHost = 'https://hf-mirror.com'
let vdb: lancedb.Connection | null = null
let extractor: null | FeatureExtractionPipeline = null
const tableMap = new Map<string, lancedb.Table>()
const assetsPath = join(app.getPath('userData'), 'assets')
const openTable = async (spaceId: string) => {
  if (tableMap.has(spaceId)) {
    return tableMap.get(spaceId)
  }
  if (!vdb || !extractor) return null
  try {
    const table = await vdb.openTable(`space-${spaceId}`)
    tableMap.set(spaceId, table)
    return table
  } catch (error) {
    const schema = new arrow.Schema([
      new arrow.Field('path', new arrow.Int32(), true),
      new arrow.Field('content', new arrow.Utf8(), true),
      new arrow.Field('type', new arrow.Utf8(), true),
      new arrow.Field('doc_id', new arrow.Utf8(), true),
      new arrow.Field(
        'vector',
        new arrow.FixedSizeList(768, new arrow.Field('item', new arrow.Float32(), true)),
        true
      )
    ])
    const table = await vdb.createEmptyTable(`space-${spaceId}`, schema, { mode: 'create' })
    await table.createIndex('doc_id')
    tableMap.set(spaceId, table)
    return table
  }
}

try {
  const databaseDir = join(app.getPath('userData'), 'lance-db')
  lancedb.connect(databaseDir).then(async (db) => {
    vdb = db
    extractor = await pipeline('feature-extraction', 'Xenova/jina-embeddings-v2-base-zh', {
      cache_dir: join(app.getPath('userData'), 'model')
    })
  })
} catch (error) {
  console.error(error)
}

export const modelReady = () => {
  return initModel()
}

ipcMain.handle('getPrompts', async () => {
  const prompts = await knex.select('*').from('prompt')
  return prompts
})

ipcMain.handle('getChats', async () => {
  const chats = await knex.select('*').from('chat').orderBy('updated', 'desc')
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
    chat.messages = await knex.select('*').from('message').where('chatId', id)
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
    const msgs = await trx.select(['id']).from('message').where('chatId', id)
    const msgIds = msgs.map((m) => m.id)
    const files = await trx.select(['name']).from('file').whereIn('messageId', msgIds)
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
    await trx.delete().from('file').whereIn('messageId', msgIds)
    await trx.delete().from('message').where('chatId', id)
    await trx.delete().from('chat').where('id', id)
  })
})

ipcMain.handle('createMessages', async (_, messages: IMessage[]) => {
  return knex('message').insert(messages)
})

ipcMain.handle('updateMessage', async (_, id: string, message: Partial<IMessage>) => {
  const updateData: any = {
    ...message
  }
  const updatedMessage = await knex('message').where({ id }).update(updateData)
  return updatedMessage
})

ipcMain.handle('deleteMessages', async (_, ids: string[]) => {
  return knex('message').whereIn('id', ids).delete()
})

ipcMain.handle('getMessages', async (_, chatId: string) => {
  return knex.select('*').from('message').where('chatId', chatId)
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
  const clients = await knex.select('*').orderBy('sort', 'asc').from('client')
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
  const updateData: any = {
    ...client
  }
  if (client.models) {
    updateData.models = JSON.stringify(client.models)
  }
  if (client.options) {
    updateData.options = JSON.stringify(client.options)
  }
  return knex('client').where({ id }).update(updateData)
})

ipcMain.handle('sortClients', async (_, ids: string[]) => {
  const caseStatement = ids.map((id, index) => `WHEN '${id}' THEN ${index}`).join(' ')
  return knex('client')
    .whereIn('id', ids)
    .update({ sort: knex.raw(`CASE id ${caseStatement} END`) })
})

ipcMain.handle('deleteClient', async (_, id: string) => {
  await knex.delete().from('client').where('id', id)
  try {
    const defaultModel = await knex('setting').where('key', 'defaultModel').first()
    if (defaultModel?.value && defaultModel?.value !== 'undefined') {
      const data = JSON.parse(defaultModel.value)
      if (data.providerId === id) {
        await knex('setting').where('key', 'defaultModel').update({ value: undefined })
      }
    }
  } catch (e) {
    console.error(e)
  }
})

ipcMain.handle('getSpaces', async () => {
  let spaces = await knex.select('*').orderBy('sort', 'asc').from('space')
  if (spaces.length === 0) {
    await knex('space').insert({
      id: nid(),
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
  await knex.transaction(async (trx) => {
    await trx('history').where('spaceId', id).delete()
    await trx('doc').where('spaceId', id).delete()
    await trx('space').where('id', id).delete()
    const files = await trx('file').where('spaceId', id).select(['name'])
    // 删除缓存区
    for (const file of files) {
      try {
        const filePath = join(assetsPath, file.name)
        if (existsSync(filePath)) {
          unlink(filePath)
        }
      } catch (e) {
        console.error(e)
      }
    }
    await trx('file').where('spaceId', id).delete()
  })
  try {
    if (vdb) {
      vdb.dropTable(`space-${id}`)
      tableMap.delete(id)
    }
  } catch (e) {}
})

ipcMain.handle('getDocs', async (_, spaceId: string, deleted?: boolean) => {
  const handle = knex('doc').where('spaceId', spaceId)
  if (deleted) {
    handle.andWhere('deleted', !!deleted)
  }
  const docs = await handle
    .orderBy('sort', 'asc')
    .select([
      'id',
      'name',
      'parentId',
      'sort',
      'created',
      'updated',
      'deleted',
      'folder',
      'lastOpenTime',
      'links',
      'spaceId'
    ])
  return docs
})

ipcMain.handle('clearDocs', async (_, spaceId: string, ids: string[]) => {
  await knex.transaction(async (trx) => {
    await trx('history').where('spaceId', spaceId).whereIn('id', ids).delete()
    await trx('doc').where('spaceId', spaceId).whereIn('id', ids).delete()
    const table = await openTable(spaceId)
    if (table) {
      await table.delete(`doc_id IN (${ids.map((id) => `'${id}'`).join(',')})`)
    }
  })
})

ipcMain.handle('getDocsByParentId', async (_, parentId: string) => {
  const docs = await knex('doc').where('parentId', parentId).orderBy('sort', 'asc').select('*')
  return docs
})

ipcMain.handle('getDocsByIds', async (_, ids: string[]) => {
  const docs = await knex('doc').whereIn('id', ids).orderBy('sort', 'asc').select('*')
  return docs
})

ipcMain.handle('createDoc', async (_, doc: IDoc) => {
  return knex('doc').insert(omit(doc, ['expand', 'children']))
})

ipcMain.handle(
  'updateDoc',
  async (
    _,
    id: string,
    doc: Partial<IDoc>,
    ctx?: { texts: string; chunks: { text: string; path: number; type: string }[] }
  ) => {
    await knex('doc')
      .where('id', id)
      .update(omit(doc, ['expand', 'children', 'id']))
    if (ctx?.chunks?.length) {
      const table = await openTable(doc.spaceId!)
      if (!table) return
      let rows = await table
        .query()
        .where(`doc_id = '${id}'`)
        .select(['path', 'doc_id', 'content'])
        .toArray()

      rows = rows.sort((a, b) => a.path - b.path)
      const pathMap = new Map<number, string>()
      const contentMap = new Map<string, number>()
      for (const row of rows) {
        pathMap.set(row.path, row.content)
        contentMap.set(row.content, row.path)
      }
      const chunkMap = new Map<number, string>(ctx.chunks.map((c) => [c.path, c.text]))
      const remove: number[] = Array.from(pathMap)
        .filter(([k]) => !chunkMap.has(k))
        .map(([k]) => k)
      for (const chunk of ctx.chunks) {
        if (!chunk.text) continue
        if (pathMap.has(chunk.path) && pathMap.get(chunk.path) === chunk.text) {
          continue
        }
        try {
          if (contentMap.has(chunk.text)) {
            await table.update({
              where: `doc_id = '${id}' AND path = ${contentMap.get(chunk.text)}`,
              values: { type: chunk.type, path: chunk.path }
            })
          } else if (pathMap.has(chunk.path)) {
            const res = await extractor!(chunk.text, {
              pooling: 'mean',
              normalize: true
            })
            await table.update({
              where: `doc_id = '${id}' AND path = ${chunk.path}`,
              values: { type: chunk.type, content: chunk.text, vector: Array.from(res.data) }
            })
          } else {
            const res = await extractor!(chunk.text, {
              pooling: 'mean',
              normalize: true
            })
            await table.add([
              {
                path: chunk.path,
                content: chunk.text,
                type: chunk.type,
                doc_id: id,
                vector: Array.from(res.data)
              }
            ])
          }
        } catch (e) {
          console.error(e)
        }
      }
      if (remove.length > 0) {
        await table.delete(`doc_id = '${id}' AND path IN (${remove.join(',')})`)
      }
      if (doc.schema) {
        insertHistory({
          schema: doc.schema as unknown as string,
          spaceId: doc.spaceId!,
          docId: id,
          medias: doc.medias as unknown as string,
          links: doc.links as unknown as string
        })
      }
    }
  }
)

ipcMain.handle('updateDocs', async (_, docs: Partial<IDoc>[]) => {
  return Promise.all(
    docs.map((d) => {
      return knex('doc')
        .where('id', d.id!)
        .update(omit(d, ['id', 'expand', 'children']))
    })
  )
})
ipcMain.handle(
  'searchVector',
  async (_, ctx: { query: string; spaceId: string; ids: string[] }) => {
    return queryVector({ query: ctx.query, spaceId: ctx.spaceId, limit: 50, ids: ctx.ids })
  }
)
ipcMain.handle(
  'fetchSpaceContext',
  async (_, ctx: { query: string; spaceId: string; ids?: string[] }) => {
    let results = await queryVector({
      query: ctx.query,
      spaceId: ctx.spaceId,
      limit: 20,
      ids: ctx.ids
    })
    const text = new Map<string, { path: number; text: string }[]>()
    for (const r of results) {
      if (text.has(r.doc_id)) {
        text.set(r.doc_id, [...text.get(r.doc_id)!, { path: r.path, text: r.content }])
      } else {
        text.set(r.doc_id, [{ path: r.path, text: r.content }])
      }
    }
    const data: { text: string; docId: string }[] = []
    for (const [docId, chunks] of text.entries()) {
      data.push({
        docId,
        text: chunks
          .sort((a, b) => a.path - b.path)
          .map((c) => c.text)
          .join('\n\n')
      })
    }
    return {
      rows: results,
      ctx: data
    }
  }
)

ipcMain.handle('deleteDoc', async (_, id: string) => {
  return knex('doc').where('id', id).update({ deleted: 1 })
})

ipcMain.handle('getDoc', async (_, id: string) => {
  const doc = await knex('doc').where('id', id).first()
  return doc
})

ipcMain.handle('getHistory', async (_, docId: string) => {
  return await knex('history')
    .where('docId', docId)
    .orderBy('created', 'desc')
    .select(['id', 'created', 'schema'])
})

ipcMain.handle('clearHistory', async (_, docId: string) => {
  return knex('history').where('docId', docId).delete()
})

ipcMain.handle('getKeyboards', async () => {
  return knex('keyboard').select()
})

ipcMain.handle('putKeyboard', async (_, record: IKeyboard) => {
  const exists = await knex('keyboard').where('task', record.task).first()
  if (exists) {
    return knex('keyboard').where('task', record.task).update({ key: record.key })
  } else {
    return knex('keyboard').insert(record)
  }
})
ipcMain.handle(
  'getFiles',
  async (_, params: { spaceId: string; page: number; pageSize: number }) => {
    const files = await knex('file')
      .where('spaceId', params.spaceId)
      .orderBy('created', 'desc')
      .select(['name', 'created', 'size'])
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize)
    return files
  }
)
ipcMain.handle('clearAttachFiles', async (_, spaceId: string) => {
  const docs = await knex('doc').where('spaceId', spaceId).select(['medias'])
  const files = await knex('file').where('spaceId', spaceId).select(['name'])
  const usedFiles = new Set<string>()
  for (const doc of docs) {
    if (doc.medias) {
      const medias = JSON.parse(doc.medias)
      for (const media of medias) {
        usedFiles.add(media)
      }
    }
  }
  const removeFiles = files.filter((f) => !usedFiles.has(f.name))
  for (const file of removeFiles) {
    try {
      const filePath = join(assetsPath, file.name)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (e) {
      console.error(e)
    }
  }
  return knex('file')
    .where('spaceId', spaceId)
    .whereIn(
      'name',
      removeFiles.map((f) => f.name)
    )
    .delete()
})

ipcMain.handle('createFiles', async (_, files: IFile[]) => {
  return knex('file').insert(files)
})

ipcMain.handle('deleteFiles', async (_, ids: string[]) => {
  const files = await knex('file').whereIn('id', ids).select(['name'])
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

const queryVector = async ({
  query,
  spaceId,
  limit,
  distance = 1.4,
  ids
}: {
  query: string
  spaceId: string
  limit: number
  distance?: number
  ids?: string[]
}): Promise<{ path: number; doc_id: string; content: string; _distance: number }[]> => {
  if (!extractor) return []
  if (!query) return []
  if (ids && !ids?.length) return []
  const db = await openTable(spaceId)
  if (!db) return []
  const queryVec = await extractor(query, {
    pooling: 'mean',
    normalize: true
  })
  const queryVector = Array.from(queryVec.data)
  let handle = db.search(queryVector).select(['path', 'doc_id', 'content'])
  if (ids?.length) {
    handle = handle.where(`doc_id IN (${ids.map((id) => `'${id}'`).join(',')})`)
  }
  handle = handle.limit(limit)
  let results = await handle.limit(limit).toArray()
  return results
    .filter((r) => r._distance < distance)
    .map((r) => ({
      ...r,
      _distance: String(r._distance)
    }))
}

const insertHistory = async (data: {
  schema: string
  spaceId: string
  docId: string
  medias?: string
  links?: string
}) => {
  const lastHistory = await knex('history')
    .where('docId', data.docId)
    .orderBy('created', 'desc')
    .select(['id', 'created'])
    .first()
  const now = Date.now()
  if (lastHistory && now - lastHistory.created < 1000 * 60 * 10) {
    return
  }
  await knex('history').insert({
    id: nid(),
    ...data,
    created: Date.now()
  })
  const res = await knex('history').where('docId', data.docId).count('id', { as: 'count' }).first()

  if (+res?.count! > 50) {
    const first = await knex('history')
      .where('docId', data.docId)
      .orderBy('created', 'asc')
      .select(['id'])
      .first()
    if (first) {
      await knex('history').where('id', first.id).delete()
    }
  }
}
