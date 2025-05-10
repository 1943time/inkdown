import Knex from 'knex'
import { app } from 'electron'
import { join } from 'path'

export const knex = Knex({
  client: 'better-sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: join(app.getPath('userData'), 'data.sqlite')
  }
})
console.log('app', app.getPath('userData'))

export const initModel = async () => {
  await knex.schema.hasTable('client').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('client', (t) => {
        t.string('id').primary()
        t.string('name')
        t.text('baseUrl').nullable()
        t.string('mode')
        t.integer('sort').defaultTo(0)
        t.string('apiKey').nullable()
        t.string('models').nullable()
        t.string('options').nullable()
      })
    }
  })

  await knex.schema.hasTable('chat').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('chat', (t) => {
        t.string('id').primary()
        t.text('topic').nullable()
        t.integer('created').defaultTo(Date.now())
        t.integer('updated').defaultTo(Date.now())
        t.string('promptId').nullable()
        t.boolean('websearch').defaultTo(false)
        t.boolean('docContext').defaultTo(false)
        t.string('model').nullable()
        t.string('clientId').nullable()
        t.integer('summaryIndex').defaultTo(0)
        t.text('summary').nullable()
      })
    }
  })

  await knex.schema.hasTable('message').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('message', (t) => {
        t.string('id').primary()
        t.string('chatId')
        t.string('role')
        t.text('content')
        t.integer('created').defaultTo(Date.now())
        t.integer('updated').defaultTo(Date.now())
        t.integer('tokens').defaultTo(0)
        t.text('reasoning').nullable()
        t.integer('duration').defaultTo(0)
        t.boolean('terminated').defaultTo(false)
        t.string('model').nullable()
        t.integer('height').nullable()
        t.string('error').nullable()
        t.string('files').nullable()
        t.string('docs').nullable()
        t.string('context').nullable()
        t.string('images').nullable()
        t.foreign('chatId').references('id').inTable('chat').onDelete('CASCADE')
      })
    }
  })

  await knex.schema.hasTable('prompt').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('prompt', (t) => {
        t.string('id').primary()
        t.text('name')
        t.text('content')
        t.integer('sort').defaultTo(0)
      })
    }
  })

  await knex.schema.hasTable('setting').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('setting', (t) => {
        t.string('key').primary()
        t.text('value')
      })
    }
  })

  await knex.schema.hasTable('space').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('space', (t) => {
        t.string('id').primary()
        t.text('name')
        t.integer('created').defaultTo(Date.now())
        t.integer('lastOpenTime').defaultTo(Date.now())
        t.integer('sort').defaultTo(0)
        t.string('writeFolderPath').nullable()
        t.string('opt').nullable()
      })
    }
  })

  await knex.schema.hasTable('doc').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('doc', (t) => {
        t.string('id').primary()
        t.text('name')
        t.string('spaceId')
        t.string('parentId').defaultTo('root')
        t.boolean('folder').defaultTo(false)
        t.text('schema').nullable()
        t.text('text').defaultTo('')
        t.integer('updated').defaultTo(Date.now())
        t.integer('deleted').defaultTo(0)
        t.integer('created').defaultTo(Date.now())
        t.integer('sort').defaultTo(0)
        t.text('links').nullable()
        t.text('medias').nullable()
        t.text('summary').nullable()
        t.integer('lastOpenTime').defaultTo(Date.now())
        t.foreign('spaceId').references('id').inTable('space').onDelete('CASCADE')
      })
    }
  })

  await knex.schema.hasTable('file').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('file', (t) => {
        t.string('name').primary()
        t.integer('created').defaultTo(Date.now())
        t.integer('size').defaultTo(0)
        t.string('spaceId')
        t.foreign('spaceId').references('id').inTable('space').onDelete('CASCADE')
      })
    }
  })

  await knex.schema.hasTable('history').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('history', (t) => {
        t.string('id').primary()
        t.string('docId')
        t.text('schema')
        t.string('spaceId')
        t.integer('created').defaultTo(Date.now())
        t.text('depFiles').nullable()
        t.foreign('spaceId').references('id').inTable('space').onDelete('CASCADE')
        t.foreign('docId').references('id').inTable('doc').onDelete('CASCADE')
      })
    }
  })
  await knex.schema.hasTable('keyboard').then((exists) => {
    if (!exists) {
      return knex.schema.createTable('keyboard', (t) => {
        t.string('task').primary()
        t.text('key')
      })
    }
  })

  await knex.schema.hasTable('docFts').then(async (exists) => {
    if (!exists) {
      await knex.raw(`
          CREATE VIRTUAL TABLE docFts USING fts5(
            spaceId UNINDEXED,
            docId UNINDEXED, 
            deleted UNINDEXED,
            words
          )
        `)
    }
  })
}
