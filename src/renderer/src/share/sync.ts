import {parse, isAbsolute, join, basename, sep} from 'path'
import {Book, Chapter, db} from './db'
import dayjs from 'dayjs'
import {CustomLeaf, Elements, HeadNode} from '../el'
import {Node} from 'slate'
import {configStore} from '../store/config'
import {mediaType} from '../editor/utils/dom'
import {encodeHtml} from '../utils'
import {remove as removeDiacritics} from 'diacritics'
import {treeStore} from '../store/tree'
import {IFileItem} from '../index'
import {readFileSync} from 'fs'
type Els = Elements & CustomLeaf

const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g

interface ChapterItem {
  folder: boolean
  filePath: string
  hash?: string
  schema?: any[],
  path?: string
  name?: string
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

  async syncDoc(filePath: string, schema: any[]) {
    this.currentDocFilePath = filePath
    if (schema) {
      this.currentDocFilePath = filePath
      const html = await this.getBaseHtml(schema)
      window.api.copyToClipboard(html)
      const p = parse(filePath)
      const name = p.name
      const code = await window.api.fs.readFile(filePath, {encoding: 'utf-8'})
      const hash = window.api.md5(code)
      const doc = await db.doc.where('filePath').equals(filePath).first()
      if (doc && hash === doc.hash) return true
      const pathHash = window.api.md5(filePath)
      await this.sdk.syncDoc('docs/' + pathHash + '.html', html, name)
      if (doc) {
        await db.doc.where('id').equals(doc.id!).modify({hash})
      } else {
        await db.doc.add({
          id: pathHash, hash, filePath, name, updated: dayjs().format('YYYY-MM-DD HH:mm:ss')
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
  private async getBaseHtml(schema: any, mode:'doc' | 'book' = 'doc') {
    let html = await this.getDocHtml(schema)
    let leadingStr = this.getLeadingHtml(schema)
    return `${this.configHtml}${mode === 'book' ? '<div class="director"></div>' : ''}<div class="content">${html}</div>${leadingStr}`
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
    const chapters = this.getChaptersByDirectory(treeStore.root!, ignores)
    const recordsMap = new Map(chapterRecords.map(c => [c.path, c]))
    const stack = chapters.slice()
    let pathSet = new Set<string>()
    await db.chapter.where('bookId').equals(book!.id!).delete()
    let first = true
    let change = false
    while (stack.length) {
      const item = stack.shift()!
      if (item.folder) {
        stack.unshift(...item.children!)
      } else {
        const ps = parse(item.filePath)
        let path = join(config.path, item.filePath.replace(root + sep, '')).replace(/\.\w+$/, '') + '.html'
        if (first) {
          path = join(config.path, 'index.html')
          first = false
        }
        pathSet.add(path)
        item.path = path
        item.name = ps.name
        await db.chapter.add({
          id: window.api.md5(book!.id! + item.filePath),
          path,
          filePath: item.filePath,
          hash: item.hash,
          name: ps.name,
          zhName: '',
          bookId: book!.id!,
          updated: this.time
        })
        if (!recordsMap.get(path) || recordsMap.get(path)!.hash !== item.hash) {
          change = true
          const html = await this.getBaseHtml(item.schema, 'book')
          await sdk.syncDoc(path, html, config.name, 'book')
        }
      }
    }
    const removeChapters = chapterRecords.filter(c => !c.folder && !pathSet.has(c.path!))
    for (let c of removeChapters) {
      await sdk.removeFile(c.path!)
    }
    // if (change) {
      const map = this.getTreeMap(chapters)
      await sdk.uploadFileByText(join(config.path, 'map.json'), JSON.stringify(map))
    // }
    sdk.dispose()
  }
  private getTreeMap(chapters: ChapterItem[]) {
    let map:any[] = []
    for (let c of chapters) {
      map.push({
        name: c.name,
        path: c.path!,
        folder: c.folder,
        children: c.folder ? this.getTreeMap(c.children!) : []
      })
    }
    return map
  }
  private getChaptersByDirectory(item: IFileItem, ignorePath: string[]):ChapterItem[] {
    return item.children!.filter(item => {
      return (item.folder || item.ext === 'md') && !ignorePath.some(p => item.filePath.startsWith(p)) && !basename(item.filePath).startsWith('.')
    }).map(item => {
      return {
        folder: item.folder,
        filePath: item.filePath,
        hash: item.folder ? undefined : window.api.md5(readFileSync(item.filePath, {encoding: 'utf-8'})),
        schema: item.folder ? undefined : treeStore.getSchema(item)?.state || [],
        children: item.folder ? this.getChaptersByDirectory(item, ignorePath) : undefined
      }
    })
  }
  private getLeadingHtml(schema: Els[]) {
    const headings = schema.filter(s => s.type === 'head' && s.level > 1 && s.level < 5) as HeadNode[]
    if (!headings) return ''
    let str = ''
    for (let h of headings) {
      const id = getHeadId(h)
      if (id) str += `<div class="leading-item" style="padding-left: ${(h.level - 2) * 16}px" data-anchor="${id}"><a href="#${id}">${id}</a></div>`
    }
    return `<div class="leading"><div class="leading-title">On this page</div><div class="leading-list">${str}</div></div>`
  }
  private async getDocHtml(schema: Els[]) {
    let str = ''
    for (let e of schema) {
      switch (e.type) {
        case 'head':
          const id = getHeadId(e)
          str += `<a href="#${id}" class="heading"><h${e.level}><span class="anchor" id="${id}"></span>${await this.getDocHtml(e.children || [])}</h${e.level}><a>`
          break
        case 'paragraph':
          str += `<p>${await this.getDocHtml(e.children || [])}</p>`
          break
        case 'blockquote':
          str += `<blockquote>${await this.getDocHtml(e.children || [])}</blockquote>`
          break
        case 'hr':
          str += '<hr class="m-hr"/>'
          break
        case 'list':
          let tag = e.order ? 'ol' : 'ul'
          str += `<${tag} class="m-list">${await this.getDocHtml(e.children || [])}</${tag}>`
          break
        case 'list-item':
          str += `<li class="m-list-item">${await this.getDocHtml(e.children || [])}</li>`
          break
        case 'table':
          let head = ''
          for (let h of e.children[0].children) {
            head += `<th>${await this.getDocHtml(h.children || [])}</th>`
          }
          str += `<table><thead><tr>${head}</tr></thead><tbody>${await this.getDocHtml(e.children?.slice(1) || [])}</tbody></table>`
          break
        case 'table-row':
          str += `<tr>${await this.getDocHtml(e.children)}</tr>`
          break
        case 'table-cell':
          str += `<td>${await this.getDocHtml(e.children)}</td>`
          break
        case 'media':
          const url = await this.uploadFile(e.url)
          str += `<img alt="${e.alt}" src="${url}"/>`
          break
        case 'code':
          if (e.language === 'mermaid') {
            str += `<div class="mermaid-container pre hide" data-code="${e.children.map(n => Node.string(n)).join('\n')}"></div>`
          } else {
            const code = e.children.map(n => Node.string(n)).join('\n')
            str += `<pre class="code-highlight tab-${configStore.config.codeTabSize}" data-lang="${e.language}"><code>${encodeHtml(code)}</code></pre>`
          }
          break
      }
      if (e.text) {
        let text = e.text
        if (e.strikethrough) text = `<del>${text}</del>`
        if (e.bold) text = `<strong>${text}</strong>`
        if (e.code) text = `<code class="inline-code">${text}</code>`
        if (e.italic) text = `<i>${text}</i>`
        if (e.url) text = `<a href="${e.url}" target="_blank">${text}</a>`
        str += text
      }
    }
    return str
  }
  private async exist(path: string) {
    try {
      await window.api.fs.stat(path)
      return true
    } catch (e) {
      return false
    }
  }
  private async uploadFile(filePath: string) {
    if (filePath.startsWith('https?:\/\/')) return filePath
    let realPath = isAbsolute(filePath) ? filePath : join(this.currentDocFilePath, '..', filePath)
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
