import {basename, isAbsolute, join, parse, sep} from 'path'
import {Book, Chapter, db} from './db'
import dayjs from 'dayjs'
import {CustomLeaf, Elements} from '../el'
import {Node} from 'slate'
import {mediaType} from '../editor/utils/dom'
import {treeStore} from '../store/tree'
import {IFileItem} from '../index'
import {readFileSync} from 'fs'
import {findText, getSectionTexts, slugify} from './utils'
import {nanoid} from 'nanoid'
import {configStore} from '../store/config'
import {removeBook} from './Record'

type Els = Elements & CustomLeaf

interface ChapterItem {
  folder: boolean
  path?: string
  name: string
  children?: ChapterItem[]
}
interface EbookConfig {
  name: string
  id?: number
  path: string
  strategy: 'auto' | 'custom'
  ignorePaths: string
  map?: any
}

export const getSlugifyName = (path: string) => slugify(basename(path).replace(/\.\w+(#.*)?/, ''))
export const getHeadId = (node: any) => slugify(findText(node))
export class Sync {
  sdk = new window.api.sdk()
  currentBookConfig: any
  currentSections:any[] = []
  noteSchemaMap = new Map<string, any[]>()
  currentBook?: Book
  private readonly prefix = 'books'
  get time() {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  private async withShareSchema(schema: any[], docPath: string) {
    const data:any[] = []
    for (let s of schema) {
      const item:any = {...s}
      if (s.type === 'code') {
        item.code = s.children.map(n => Node.string(n)).join('\n')
      }
      if (s.type === 'head') {
        item.id  = getHeadId(s)
        item.title = Node.string(s)
      }

      if (s.type === 'media') {
        item.src = await this.uploadFile(s.url, docPath)
      }

      if (s.children?.length) {
        item.children = await this.withShareSchema(s.children, docPath)
      }
      if (s.url && !s.url.startsWith('http')) {
        let targetPath = isAbsolute(s.url) ? s.url : join(docPath, '..', s.url)
        let hash = ''
        if (/#.*$/.test(targetPath)) {
          const part =targetPath.split('#')
          targetPath = part[0]
          hash = '#' + slugify(part[1])
        }
        const exist = await this.exist(targetPath)
        if (exist) {
          if (this.currentBook) {
            item.href = `/book/${this.currentBook.path}/${window.api.md5(targetPath)}${hash}`
          } else {
            item.href = `/doc/${window.api.md5(targetPath)}${hash}`
          }
        }
      } else {
        item.href = s.url
      }
      data.push(item)
    }
    return data
  }
  async syncDoc(filePath: string, schema: any[]) {
    if (schema) {
      const p = parse(filePath)
      const name = p.name
      const schemaData = {
        schema: await this.withShareSchema(schema, filePath),
        title:name
      }
      window.api.copyToClipboard(JSON.stringify(schemaData))
      const code = await window.api.fs.readFile(filePath, {encoding: 'utf-8'})
      const hash = window.api.md5(code)
      const doc = await db.doc.where('filePath').equals(filePath).first()
      if (doc && hash === doc.hash) return true
      const pathHash = window.api.md5(filePath)
      await this.sdk.uploadFileByText('docs/' + pathHash + '.json', JSON.stringify(schemaData))
      if (doc) {
        await db.doc.where('id').equals(doc.id!).modify({hash})
      } else {
        await db.doc.add({
          id: pathHash, hash, filePath, name, updated: this.time
        })
      }
      this.sdk.dispose()
      return true
    }
    return ''
  }
  async syncEbook(config: EbookConfig) {
    this.currentSections = []
    this.currentBookConfig = config
    let chapterRecords:Chapter[] = []
    let book: Book | undefined
    const root = treeStore.root.filePath!
    const sdk = new window.api.sdk()
    if (config.id) {
      book = await db.book.get(config.id!)
      if (book) {
        if (book.path !== config.path) {
          await removeBook(config.id)
          book = undefined
        } else {
          chapterRecords = await db.chapter.where('bookId').equals(config.id).toArray()
          db.book.update(config.id!, {
            strategy: config.strategy,
            name: config.name,
            ignorePaths: config.ignorePaths,
            updated: this.time,
            map: config.map,
            path: config.path
          })
          book = await db.book.get(config.id)
        }
      }
    }
    if (!book) {
      const id = await db.book.add({
        filePath: root,
        strategy: config.strategy,
        name: config.name,
        ignorePaths: config.ignorePaths,
        path: config.path,
        updated: this.time,
        map: config.map
      })
      book = await db.book.get(id)
    }

    this.currentBook = book
    const recordsMap = new Map(chapterRecords.map(c => [c.path, c]))

    if (config.strategy === 'auto') {
      const ignores = config.ignorePaths ? config.ignorePaths.split(',').map(p => join(root, p)) : []
      const map = await this.getMapByDirectory({
        item: treeStore.root!,
        book: book!,
        records: recordsMap,
        sdk,
        ignorePath: ignores
      })
      return this.saveEbook({
        config,
        recordsMap,
        sdk,
        book: book!,
        map
      })
    } else {
      const map = await this.getCustomEbookMap({
        config,
        recordsMap,
        sdk,
        book: book!,
      })
      return this.saveEbook({
        config,
        recordsMap,
        sdk,
        book: book!,
        map
      })
    }
  }
  private async getCustomEbookMap(ctx: {
    config: EbookConfig, book: Book, recordsMap: Map<string, Chapter>, sdk: InstanceType<typeof window.api.sdk>
  }) {
    this.noteSchemaMap.clear()
    const stack = treeStore.root.children!.slice()
    while (stack.length) {
      const item = stack.shift()!
      if (item.ext === 'md') {
        this.noteSchemaMap.set(item.filePath, treeStore.schemaMap.get(item)?.state || [])
      }
      if (item.folder) {
        stack.push(...item.children!)
      }
    }
    return this.getChapterByConfig({
      ...ctx, records: ctx.recordsMap, items: JSON.parse(ctx.config.map)
    })
  }

  private async getChapterByConfig(ctx: {
    items: ChapterItem[],
    records: Map<string, Chapter>,
    book: Book,
    sdk: InstanceType<typeof window.api.sdk>
  }) {
    const chapters: ChapterItem[] = []
    for (let c of ctx.items) {
      if (!c.name) throw new Error(configStore.isZh ? 'name字段为空' : 'name field is empty')
      if (c.folder) {
        if (!c.children?.length) continue
        chapters.push({
          ...c,
          path: nanoid(),
          children: await this.getChapterByConfig({
            ...ctx,
            items: c.children!
          })
        })
      } else {
        if (!c.path) throw new Error(configStore.isZh ? 'path字段为空' : 'path fields empty')
        let realPath = join(ctx.book.filePath, c.path!)
        if (!realPath.endsWith('.md')) realPath += '.md'
        if (!(await this.exist(realPath))) throw new Error(`${c.path} ${configStore.isZh ? '文件不存在' : 'file dose not exist'}`)
        const path = window.api.md5(realPath)
        const hash = window.api.md5(readFileSync(realPath, {encoding: 'utf-8'}))
        const chapter: ChapterItem = {
          folder: false,
          name: c.name,
          path: path
        }
        const shareSchema = await this.withShareSchema(this.noteSchemaMap.get(realPath) || [], realPath)
        this.currentSections.push({
          section: getSectionTexts(shareSchema).sections,
          path: path,
          name: c.name
        })
        if (!ctx.records.get(path) || ctx.records.get(path)!.hash !== hash) {
          await ctx.sdk.uploadFileByText(`${this.prefix}/${ctx.book.path}/${path}.json`, JSON.stringify({
            title: c.name,
            schema: shareSchema
          }))
          if (!ctx.records.get(path)) {
            await db.chapter.add({
              hash,
              path,
              filePath: realPath,
              name: c.name,
              updated: this.time,
              bookId: ctx.book.id!
            })
          } else {
            await db.chapter.update(ctx.records.get(path)!.id!, {
              hash: hash,
              updated: this.time
            })
          }
        }
        chapters.push(chapter)
      }
    }
    return chapters
  }

  private async saveEbook(ctx: {
    config: EbookConfig, book: Book, recordsMap: Map<string, Chapter>, sdk: InstanceType<typeof window.api.sdk>, map: ChapterItem[]
  }) {
    const {config, book, recordsMap, sdk} = ctx
    const root = treeStore.root.filePath!
    const map = ctx.map

    await sdk.uploadFileByText(`${this.prefix}/${config.path}/map.json`, JSON.stringify({
      title: book!.name,
      path: book!.path,
      map
    }))

    if (this.currentSections.length) {
      await sdk.uploadFileByText(`${this.prefix}/${config.path}/text.json`, JSON.stringify(this.currentSections))
    }

    const insertSet = new Set<string>()
    const stack = map.slice()
    while (stack.length) {
      const cur = stack.pop()!
      if (!cur.folder) {
        insertSet.add(cur.path!)
      } else {
        stack.push(...cur.children!)
      }
    }
    const removeChapters = await db.chapter.where('bookId').equals(book!.id!).filter(item => {
      return !insertSet.has(item.path)
    }).toArray()

    for (let c of removeChapters) {
      await sdk.removeFile(`${this.prefix}/${config.path}/${c.path}.json`)
    }

    await db.chapter.where('bookId').equals(book!.id!).filter(item => {
      return !insertSet.has(item.path)
    }).delete()
    sdk.dispose()
    this.currentBook = undefined
  }
  private async getMapByDirectory(ctx: {
    item: IFileItem,
    ignorePath: string[],
    records: Map<string, Chapter>,
    book: Book,
    sdk: InstanceType<typeof window.api.sdk>
  }) {
    const chapters: ChapterItem[] = []
    for (let c of ctx.item.children!) {
      const ps = parse(c.filePath)
      if (
        ctx.ignorePath.some(p => c.filePath.startsWith(p)) ||
        c.filePath.split(sep).some(p => p.startsWith('.'))
      ) continue
      if (c.folder) {
        chapters.push({
          folder: true,
          name: ps.name,
          path: window.api.md5(c.filePath),
          children: await this.getMapByDirectory({
            ...ctx,
            item: c
          })
        })
      } else if (c.ext === 'md') {
        const path = window.api.md5(c.filePath)
        const hash = window.api.md5(readFileSync(c.filePath, {encoding: 'utf-8'}))
        const chapter: ChapterItem = {
          folder: false,
          name: ps.name,
          path: path
        }
        const shareSchema = await this.withShareSchema(treeStore.getSchema(c)?.state || [], c.filePath)
        this.currentSections.push({
          section: getSectionTexts(shareSchema).sections,
          path: path,
          name: ps.name
        })
        if (!ctx.records.get(path) || ctx.records.get(path)!.hash !== hash) {
          await ctx.sdk.uploadFileByText(`${this.prefix}/${ctx.book.path}/${path}.json`, JSON.stringify({
            title: ps.name,
            schema: shareSchema
          }))
          if (!ctx.records.get(path)) {
            await db.chapter.add({
              hash,
              path,
              filePath: c.filePath,
              name: ps.name,
              updated: this.time,
              bookId: ctx.book.id!
            })
          } else {
            await db.chapter.update(ctx.records.get(path)!.id!, {
              hash: hash,
              updated: this.time
            })
          }
        }
        chapters.push(chapter)
      }
    }
    return chapters
  }
  private async exist(path: string) {
    try {
      await window.api.fs.stat(path)
      return true
    } catch (e) {
      return false
    }
  }
  private async uploadFile(filePath: string, docPath: string) {
    if (filePath.startsWith('https?:\/\/')) return filePath
    let realPath = isAbsolute(filePath) ? filePath : join(docPath, '..', filePath)
    const exist = await this.exist(realPath)
    if (!exist) return filePath
    const file = await db.file.where('filePath').equals(realPath).first()
    const m = mediaType(filePath)
    if (!['image'].includes(m)) return filePath
    const buffer = await window.api.fs.readFile(realPath)
    const hash = window.api.md5(buffer)
    const ext = parse(realPath).ext
    const name = `files/${hash}${ext}`
    console.log('file', file, realPath, hash)
    if (file && file.hash === hash) {
      console.log('return ',realPath)
      return '/' + name
    }
    await this.sdk.uploadFile(name, realPath)
    if (file) {
      await db.file.update(file.id!, {hash})
    } else {
      await db.file.add({hash, filePath: realPath})
    }
    return '/' + name
  }
}
