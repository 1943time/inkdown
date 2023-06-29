import {parse, isAbsolute, join, basename, sep} from 'path'
import {Book, Chapter, db} from './db'
import dayjs from 'dayjs'
import {CustomLeaf, Elements, HeadNode} from '../el'
import {Node} from 'slate'
import {configStore} from '../store/config'
import {mediaType} from '../editor/utils/dom'
import {remove as removeDiacritics} from 'diacritics'
import {treeStore} from '../store/tree'
import {IFileItem} from '../index'
import {readFileSync} from 'fs'
import {has} from 'mobx'
type Els = Elements & CustomLeaf

const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g

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
}
export const slugify = (str: string): string => {
  return (
    removeDiacritics(str)
      .replace(rControl, '')
      .replace(rSpecial, '-')
      .replace(/\-{2,}/g, '-')
      .replace(/^\-+|\-+$/g, '')
      .replace(/^(\d)/, '_$1')
      .toLowerCase()
  )
}

const findText = (node: any) => {
  let stack = node.children.slice()
  let text = ''
  while (stack.length) {
    const n = stack.shift()!
    if (n.text) {
      text += n.text
    } else if (n.children?.length) {
      stack.unshift(...n.children.slice())
    }
  }
  return text
}

export const getSlugifyName = (path: string) => slugify(basename(path).replace(/\.\w+(#.*)?/, ''))
export const getHeadId = (node: any) => slugify(findText(node))
export class Sync {
  sdk = new window.api.sdk()
  currentDocFilePath = ''
  currentBookConfig: any
  get configHtml() {
    let config = `
      <input type="hidden" name="codeTheme" value="${configStore.config.codeTheme}"/>
      <input type="hidden" name="codeLineNumber" value="${configStore.config.codeLineNumber}"/>
    `
    if (this.currentBookConfig) config += `<input type="hidden" name="prefix" value="${this.currentBookConfig.path}"/>`
    return config
  }
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
        s.src = await this.uploadFile(s.url, docPath)
      }

      if (s.children?.length) {
        item.children = await this.withShareSchema(s.children, docPath)
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
    if (config.strategy === 'auto') {
      return this.syncAutoEbook(config)
    }
  }

  private async syncAutoEbook(config: EbookConfig) {
    this.currentBookConfig = config
    const root = treeStore.root.filePath!
    const ignores = config.ignorePaths ? config.ignorePaths.split(',').map(p => join(root, p)) : []
    let chapterRecords:Chapter[] = []
    let book: Book | undefined
    const sdk = new window.api.sdk()
    if (config.id) {
      chapterRecords = await db.chapter.where('bookId').equals(config.id).toArray()
      book = await db.book.get(config.id!)
      if (book) {
        db.book.update(config.id!, {
          strategy: config.strategy,
          name: config.name,
          ignorePaths: config.ignorePaths,
          updated: this.time
        })
        if (book.path !== config.path) {
          sdk.removeFile(join(book.path, 'map.json'))
          sdk.removeFile(join(book.path, 'text.json'))
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
        updated: this.time
      })
      book = await db.book.get(id)
    }
    const recordsMap = new Map(chapterRecords.map(c => [c.path, c]))
    const map = await this.getMapByDirectory({
      item: treeStore.root!,
      book: book!,
      records: recordsMap,
      sdk,
      ignorePath: ignores
    })
    await sdk.uploadFileByText(`${config.path}/map.json`, JSON.stringify(map))
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
    await db.chapter.where('bookId').equals(book!.id!).filter(item => {
      return !insertSet.has(item.path)
    }).delete()

    sdk.dispose()
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
          children: await this.getMapByDirectory({
            ...ctx,
            item: c
          })
        })
      } else if (c.ext === 'md') {
        const path = window.api.md5(c.filePath)
        const chapter: ChapterItem = {
          folder: false,
          name: ps.name,
          path: path
        }
        const hash = window.api.md5(readFileSync(c.filePath, {encoding: 'utf-8'}))
        if (!ctx.records.get(path) || ctx.records.get(path)!.hash !== hash) {
          await ctx.sdk.uploadFileByText(`${ctx.book.path}/${path}.json`, await this.withShareSchema(treeStore.getSchema(c)?.state || [], c.filePath))
          if (!ctx.records.get(path)) {
            await db.chapter.add({
              hash,
              path,
              filePath: c.filePath,
              folder: false,
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
    const buffer = await window.api.fs.readFile(filePath)
    const hash = window.api.md5(buffer)
    const ext = parse(filePath).ext
    const name = `files/${hash}${ext}`
    if (file && file.hash === hash) {
      return '/' + name
    }
    let contentType = `image/${ext}`
    await this.sdk.uploadFile(name, filePath, contentType)
    if (file) {
      await db.file.update(file.id!, {hash})
    } else {
      await db.file.add({hash, filePath})
    }
    return '/' + name
  }
}
