import { ipcMain, app } from 'electron'
import { initModel, knex } from './model'
import { IChat, IMessage, ISetting, IClient, ISpace, IDoc, IHistory, IFile } from 'types/model'
import { omit, prepareFtsTokens } from '../utils'
import { join } from 'path'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { customAlphabet } from 'nanoid'
import * as lancedb from '@lancedb/lancedb'
import * as arrow from 'apache-arrow'
import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers'
env.remoteHost = 'https://hf-mirror.com'
const nid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 15)
let vdb: lancedb.Connection | null = null
let extractor: null | FeatureExtractionPipeline = null
const tableMap = new Map<string, lancedb.Table>()
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
          unlink(filePath)
        }
      } catch (e) {
        console.error(e)
      }
    }
    await trx('docFts').where('spaceId', id).delete()
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
  handle.andWhere('deleted', !!deleted)
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
  return knex('doc').where('spaceId', spaceId).whereIn('id', ids).delete()
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
    if (ctx?.texts) {
      const tokens = prepareFtsTokens(ctx.texts)
      const exists = await knex('docFts').where('docId', id).first()
      if (exists) {
        await knex('docFts')
          .where('docId', id)
          .update({ text: ctx.texts, words: tokens.join(' ') })
      } else {
        await knex('docFts').insert({
          docId: id,
          text: ctx.texts,
          words: tokens.join(' '),
          spaceId: doc.spaceId
        })
      }
    }

    if (doc.deleted) {
      const table = await openTable(doc.spaceId!)
      if (table) {
        await table.delete(`doc_id = '${id}'`)
      }
    } else if (ctx?.chunks.length) {
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

ipcMain.handle('fetchSpaceContext', async (_, ctx: { query: string; spaceId: string }) => {
  if (!extractor) return null
  if (!ctx.query) return []
  const db = await openTable(ctx.spaceId)
  if (!db) return []
  const queryVec = await extractor(ctx.query, {
    pooling: 'mean',
    normalize: true
  })
  const queryVector = Array.from(queryVec.data)
  let results = await db
    .search(queryVector)
    .select(['path', 'doc_id', 'content'])
    .limit(20)
    .toArray()
  results = results.filter((r) => r._distance < 1.4)
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
    rows: results.map((r) => {
      return {
        ...r,
        _distance: String(r._distance)
      }
    }),
    ctx: data
  }
})

ipcMain.handle('searchDocs', async (_, spaceId: string, text: string) => {
  const tokens = prepareFtsTokens(text)

  const likeResults = await knex.raw(
    `
    SELECT docId
    FROM docFts
    WHERE spaceId = ? AND text LIKE ?
    `,
    [spaceId, `%${text}%`]
  )

  const matchResults = await knex.raw(
    `
    SELECT docId, bm25(docFts) AS score
    FROM docFts
    WHERE spaceId = ?
    ${likeResults.length > 0 ? 'AND docId NOT IN (' + likeResults.map((r: any) => `'${r.docId}'`).join(',') + ')' : ''}
    AND words MATCH ?
    ORDER BY score ASC
    LIMIT 30
    `,
    [spaceId, tokens.join(' OR ')]
  )

  const results = [
    ...likeResults.map((result: any) => ({ docId: result.docId, rank: 1.0 })),
    ...matchResults.map((result: any) => ({ docId: result.docId, rank: 0.3 }))
  ]

  const docs = await knex('doc')
    .where('spaceId', spaceId)
    .whereIn(
      'id',
      results.map((d) => d.docId)
    )
    .select(['id', 'schema'])
  return { docs, tokens }
})

ipcMain.handle('deleteDoc', async (_, id: string) => {
  return knex('doc').where('id', id).update({ deleted: 1 })
})

ipcMain.handle('getDoc', async (_, id: string) => {
  const doc = await knex('doc').where('id', id).first()
  return doc
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
