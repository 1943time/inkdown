import {BsFile} from './file'
import {isAbsolute, join, parse} from 'path'
import {isExist, schemaToTexts, stat, toPath} from './utils'
import {readdirSync, readFileSync} from 'fs'
import {message$} from '../../utils'
import {nanoid} from 'nanoid'
import {ShareApi} from './api'
import {IBook} from '../model'
import {parserMdToSchema} from '../../editor/parser/parser'

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
  private ignorePath:string[] = []
  constructor(
    private readonly api: ShareApi,
    private readonly file: BsFile
  ) {}
  async syncBook(book: Partial<IBook>) {
    this.root = book.filePath!
    const config = book.config!
    if (config.ignorePaths) {
      this.ignorePath = config.ignorePaths.split(',').map(p => {
        return isAbsolute(p) ? p : join(this.root, p)
      })
    } else {
      this.ignorePath = []
    }
    let map: SpaceDocMap[], docMap: Map<string, SpaceDocMap>
    try {
      if (!config.strategy || config.strategy === 'auto') {
        const res = this.getMapByAuto(this.root)
        map = res.map
        docMap = res.fileMap
      } else {
        if (!config.chapters?.length) throw new Error('Please configure the chapter field correctly')
        const res = this.getMapByConfig(config.chapters)
        map = res.map
        docMap = res.fileMap
      }
    } catch (e: any) {
      message$.next({
        type: 'warning',
        content: e.message
      })
      throw e
    }

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
    const filesSet = await this.file.bookFile(add, res.book.id, this.root, res.files)
    const removeFiles = res.files.filter(d => !filesSet.has(d.filePath)).map(d => d.id)
    return this.api.shareBook({
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
        // const [schema] = await parserMdToSchema([m.md!])
        addChapter.push({
          path: m.path,
          hash: m.hash!,
          // schema,
          // texts: schemaToTexts(schema),
          name: m.name,
          filePath: m.filePath
        })
      } else if (m.children?.length) {
        addChapter = addChapter.concat(await this.process(m.children))
      }
    }
    return addChapter
  }

  private getMapByAuto(filePath: string, fileMap = new Map<string, SpaceDocMap>()) {
    const map: SpaceDocMap[] = []
    for (let f of readdirSync(filePath)) {
      const path = join(filePath, f)
      if (f.startsWith('.') || this.ignorePath.some(i => path.startsWith(i))) continue
      if (stat(path)!.isDirectory()) {
        const item:SpaceDocMap = {
          path: toPath(this.root, path),
          name: parse(f).name,
          filePath: path,
          folder: true
        }
        item.children = this.getMapByAuto(path, fileMap).map
        map.push(item)
      } else if (path.toLowerCase().endsWith('.md') || path.toLowerCase().endsWith('.markdown')) {
        const md = readFileSync(path, {encoding: 'utf-8'})
        const item:SpaceDocMap = {
          path: toPath(this.root, path),
          name: parse(f).name,
          filePath: path,
          hash: window.api.md5(md),
          md
        }
        fileMap.set(item.path, item)
        map.push(item)
      }
    }
    return {map, fileMap}
  }

  private getMapByConfig(config: ConfigChapter[], fileMap = new Map<string, SpaceDocMap>()) {
    const map: SpaceDocMap[] = []
    for (let c of config) {
      if (c.folder) {
        const item:SpaceDocMap = {
          path: nanoid(),
          name: c.name || c.path,
          filePath: '',
          folder: true
        }
        item.children = this.getMapByConfig(c.children || [], fileMap).map
        map.push(item)
      } else {
        let path = join(this.root, c.path)
        if (!path.endsWith('.md')) path += '.md'
        if (!isExist(path)) throw new Error(`The file ${path} does not exist`)
        const md = readFileSync(path, {encoding: 'utf-8'})
        const item:SpaceDocMap = {
          path: c.path.replace(/\.\w+$/, ''),
          name: c.name || c.path,
          filePath: path,
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
