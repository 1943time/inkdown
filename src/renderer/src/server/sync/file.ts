import {parse, isAbsolute, join} from 'path'
import {message$} from '../../utils'
import {getHeadId, slugify} from '../../utils/sections'
import {ShareApi} from './api'
import {getFileSize, toPath} from './utils'
import {existsSync} from 'fs'
import {Node} from 'slate'

const uploadType = new Set([
  '.png', '.jpeg', '.jpg', '.webp', '.gif', '.pdf', '.doc', '.docx', 'xls', '.xlsx', '.ppt', '.pptx', '.txt'
])

type ImageList = {el: any, filePath: string}

export class BsFile {
  private root = ''
  private currentDocId = ''
  private currentBookId = ''
  private fileMap = new Map<string, { name: string, filePath: string}>()
  constructor(
    private readonly api: ShareApi
  ) {}

  async docFile(data: {
    filePath: string, schema: any[],
    docId: string,
    files: {name: string, filePath: string}[]
    root: string
  }) {
    this.root = data.root
    this.fileMap = new Map(data.files.map(f => [f.filePath, f]))
    this.currentBookId = ''
    this.currentDocId = data.docId
    return this.process([{
      filePath: data.filePath,
      schema: data.schema
    }])
  }

  async bookFile(chapters: any[], bookId: string, root: string, files: {id: string, name: string, filePath: string}[]) {
    this.fileMap = new Map(files.map(f => [f.filePath, f]))
    this.root = root
    this.currentDocId = ''
    this.currentBookId = bookId
    return this.process(chapters.map(c => {
      return {
        filePath: c.filePath,
        schema: c.schema!
      }
    }))
  }
  private async process(data: {filePath: string, schema: any[]}[]) {
    const imageList:ImageList[] = []
    for (let d of data) {
      imageList.push(...this.processSchema(d.schema, d.filePath))
    }
    await this.upload(imageList)
    return new Set(imageList.map(i => i.filePath))
  }

  private async upload(imageList: ImageList[]) {
    for (let s of imageList) {
      const remote = this.fileMap.get(s.filePath)
      if (remote) {
        s.el.url = remote.name
      } else {
        try {
          let res: {name: string, message?: string}
          res = await this.api.uploadDocFile({
            filePath: s.filePath,
            docId: this.currentDocId,
            bookId: this.currentBookId
          })
          if (res.message) return message$.next({type: 'warning', content: res.message})
          this.fileMap.set(s.filePath, {
            ...s,
            label: res.name
          })
          s.el.url = res.name
        } catch (e: any) {
          console.log('upload error', e)
        }
      }
    }
  }

  private processSchema(schema: any[], docPath: string) {
    const imageList: {el: any, filePath: string}[] = []
    for (let s of schema) {
      if (s.type === 'media' && s.url && uploadType.has(parse(s.url).ext)) {
        const realPath = this.getRealPath(docPath, s.url)
        if (!realPath) continue
        imageList.push({
          el: s,
          filePath: realPath
        })
      }
      if (s.text && s.url && !/^\w+:\/\//.test(s.url)) {
        let url = s.url as string
        const hash = url.match(/#(.*)$/)
        if (hash) url = url.split('#')[0]
        if (url && !url.endsWith('.md') && !url.endsWith('.markdown')) continue
        if (url) {
          let realPath = this.getRealPath(docPath, url)
          if (realPath) {
            realPath = realPath.replace(/\.\w+$/, '')
            if (hash) realPath += `#${slugify(hash[1])}`
            s.url = toPath(this.root, realPath)
          }
        } else if (hash) {
          s.url = `#${slugify(hash[1])}`
        }
      }

      if (s.type === 'head') {
        s.id = getHeadId(s)
        s.title = Node.string(s)
      }
      if (s.type === 'code') {
        s.code = s.children.map((c: any) => c.children[0].text).join('\n')
      }
      if (s.children?.length) {
        imageList.push(...this.processSchema(s.children, docPath))
      }
    }
    return imageList
  }
  private getRealPath(docPath: string, url: string) {
    let filePath = isAbsolute(url) ? url : join(docPath, '..', url)
    if (existsSync(filePath)) {
      return filePath
    } else {
      if (isAbsolute(url) && existsSync(join(this.root || '', url))) {
        return join(this.root, url)
      } else {
        return null
      }
    }
  }
}
