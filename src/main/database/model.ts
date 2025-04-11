import Knex from 'knex'
import { app } from 'electron'
import { join } from 'path'

export const knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: join(app.getPath('userData'), 'data.sqlite')
  }
})

export const initModel = () => {
  return Promise.all([
    knex.schema.hasTable('client').then((exists) => {
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
      return Promise.resolve()
    }),
    knex.schema.hasTable('chat').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('chat', (t) => {
          t.string('id').primary()
          t.text('topic').nullable()
          t.integer('created').defaultTo(Date.now())
          t.integer('updated').defaultTo(Date.now())
          t.string('promptId').nullable()
          t.boolean('websearch').defaultTo(false)
          t.string('model').nullable()
          t.string('clientId').nullable()
          t.integer('summaryIndex').defaultTo(0)
          t.text('summary').nullable()
        })
      }
      return Promise.resolve()
    }),
    knex.schema.hasTable('message').then((exists) => {
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
          t.string('error').nullable()
          t.string('files').nullable()
          t.string('images').nullable()
          t.foreign('chatId').references('id').inTable('chat').onDelete('CASCADE')
        })
      }
      return Promise.resolve()
    }),
    knex.schema.hasTable('prompt').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('prompt', (t) => {
          t.string('id').primary()
          t.text('name')
          t.text('content')
          t.integer('sort').defaultTo(0)
        })
      }
      return Promise.resolve()
    }),
    knex.schema.hasTable('setting').then((exists) => {
      if (!exists) {
        return knex.schema.createTable('setting', (t) => {
          t.string('key').primary()
          t.text('value')
        })
      }
      return Promise.resolve()
    })
  ])
}
