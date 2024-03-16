import {BsFile} from './file'
import {isAbsolute, join, parse} from 'path'
import {isExist, schemaToTexts, stat, toPath} from './utils'
import {readdirSync, readFileSync} from 'fs'
import {message$} from '../../utils'
import {nanoid} from 'nanoid'
import {ShareApi} from './api'
import {IBook} from '../model'
import {openMdParserHandle, parserMdToSchema, ParserResult} from '../../editor/parser/parser'
import {IFileItem, ISpaceNode} from '../../index'
import {slugify} from '../../editor/utils/dom'

export type SpaceDocMap = {
  name: string
  path: string
  md?: string
  hash?: string
  folder?: boolean
  schema?: any[]
  texts?: any[]
  filePath: string
  children?: SpaceDocMap[]
}

type ConfigChapter = {
  path: string
  name?: string
  folder?: boolean
  children: ConfigChapter[]
}
export class Book {
  private root = ''
  parser!: (codes: {filePath: string, code?: string}[]) => Promise<ParserResult[]>
  constructor(
    private readonly api: ShareApi,
    private readonly file: BsFile
  ) {}
  async syncBook(book: Partial<IBook>, node: IFileItem | ISpaceNode) {
    const {parser, terminate} = openMdParserHandle()
    this.parser = parser
    try {
      this.root = book.filePath!
      const {map, fileMap: docMap} = this.getMapByAuto(node)
      const res = await this.api.prefetchBook(book.name ? {
        id: book.id,
        filePath: book.filePath!,
        name: book.name!,
        path: book.path!,
        config: book.config!
      }: {id: book.id!})

      const chapterMap = new Map(res.chapters.map(c => [c.path, c]))
      const remove = res.chapters
        .filter(c => !docMap.get(c.path) || docMap.get(c.path)!.hash !== c.hash)
        .map(c => {
          return c.id!
        })
      const add = await this.process(map)
      const texts = add.map(c => {
        return {path: c.path, texts: c.texts}
      })
      const exist = new Set<string>()
      for (let a of add) {
        if (exist.has(a.path)) {
          return message$.next({
            type: 'info',
            content: `File path conflict: ${a.path}`
          })
        }
        exist.add(a.path)
      }
      const filesSet = await this.file.bookFile(add, res.book.id, this.root, res.files)
      const removeFiles = res.files.filter(d => !filesSet.has(d.filePath)).map(d => d.id)
      return await this.api.shareBook({
        removeDocs: remove,
        removeFiles: removeFiles,
        texts: JSON.stringify(texts),
        addChapters: add.filter(a => {
          return !chapterMap.get(a.path) || chapterMap.get(a.path)!.hash !== a.hash
        }).map(a => {
          return {
            schema: JSON.stringify(a.schema || []),
            path: a.path,
            hash: a.hash
          }
        }),
        map: JSON.stringify(this.extractMap(map)),
        bookId: res.book.id
      })
    } catch (e: any) {
      message$.next({
        type: 'warning',
        content: e.message
      })
      throw e
    } finally {
      terminate()
    }
  }

  private extractMap(map: SpaceDocMap[]): any[] {
    return map.map(m => {
      return {
        name: m.name,
        path: m.path,
        folder: m.folder,
        children: m.folder ? this.extractMap(m.children || []) : undefined
      }
    })
  }

  private async process(map: SpaceDocMap[]) {
    let addChapter: SpaceDocMap[] = []
    for (let m of map) {
      if (!m.folder) {
        const [res] = await this.parser([{filePath: m.filePath}])
        const name = parse(m.filePath).name
        res.schema.unshift({
          type: 'head', level: 1,
          id: slugify(name),
          title: name,
          children: [{text: name}]
        })
        addChapter.push({
          path: m.path,
          hash: m.hash!,
          schema: res.schema,
          texts: schemaToTexts(res.schema),
          name: m.name,
          filePath: m.filePath
        })
      } else if (m.children?.length) {
        addChapter = addChapter.concat(await this.process(m.children))
      }
    }
    return addChapter
  }

  private getMapByAuto(node: IFileItem | ISpaceNode, fileMap = new Map<string, SpaceDocMap>()) {
    const map: SpaceDocMap[] = []
    for (let f of node.children!) {
      const name = parse(f.filePath).name
      if (f.filePath.startsWith('.') || name.startsWith('.')) continue
      if (f.folder) {
        const item:SpaceDocMap = {
          path: toPath(this.root, f.filePath),
          name: parse(f.filePath).name,
          filePath: f.filePath,
          folder: true
        }
        item.children = this.getMapByAuto(f, fileMap).map
        map.push(item)
      } else if (f.ext === 'md') {
        const md = readFileSync(f.filePath, {encoding: 'utf-8'})
        const item:SpaceDocMap = {
          path: toPath(this.root, f.filePath),
          name: parse(f.filePath).name,
          filePath: f.filePath,
          hash: window.api.md5(md),
          md
        }
        fileMap.set(item.path, item)
        map.push(item)
      }
    }
    return {map, fileMap}
  }
}
