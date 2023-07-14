import mermaid from 'mermaid'
import {Node} from 'slate'
import {configStore} from '../../store/config'
import {ipcRenderer} from 'electron'
import {isAbsolute, join, parse, sep} from 'path'
import {treeStore} from '../../store/tree'
import {IFileItem} from '../../index'
import {MainApi, saveDialog} from '../../api/main'
import katex from 'katex'
import {getHeadId, getSectionTexts} from '../../utils/sections'
import {nanoid} from 'nanoid'
import {message$} from '../../utils'

interface ChapterItem {
  folder: boolean
  path?: string
  name: string
  children?: ChapterItem[]
}

interface DocMap {
  name: string
  id: string
  title?: string
  folder?: boolean
  content?: string,
  outline?: string
  children?: DocMap[]
}
interface EbookConfig {
  name: string
  id?: number
  strategy: 'auto' | 'custom'
  ignorePaths?: string
  map?: any
}
let currentSections: any[] = []

const exist = async (path: string) => {
  try {
    await window.api.fs.stat(path)
    return true
  } catch (e) {
    return false
  }
}
const getMapByAuto = async (nodes: IFileItem[], ignorePath: string[] = []) => {
  let docs: DocMap[] = []
  for (let n of nodes) {
    if (
      ignorePath.some(p => n.filePath.startsWith(p)) ||
      n.filePath.split(sep).some(p => p.startsWith('.'))
    ) continue
    if (n.folder) {
      docs.push({
        name: n.filename,
        folder: true,
        id: 'a' + window.api.md5(n.filePath),
        children: await getMapByAuto(n.children!, ignorePath)
      })
    } else {
      const tree = treeStore.schemaMap.get(n)?.state || []
      const title = parse(n.filePath).name
      const id = 'a' + window.api.md5(n.filePath)
      docs.push({
        name: n.filename,
        id,
        title: title,
        content: await transform(tree, n),
        outline: getOutline(tree)
      })
      currentSections.push({
        section: getSectionTexts(tree).sections,
        path: id,
        name: n.filename
      })
    }
  }
  return docs
}
const getAssets = async () => {
  const env = await ipcRenderer.invoke('get-env') as {webPath: string}
  const fs = window.api.fs
  const files = await fs.readdir(env.webPath)
  const scriptPath = files.find(f => f.endsWith('.js'))
  const cssPath = files.find(f => f.endsWith('.css'))
  return {
    script: await fs.readFile(join(env.webPath, scriptPath!), {encoding:'utf-8'}),
    css: await fs.readFile(join(env.webPath, cssPath!), {encoding:'utf-8'})
  }
}
const eBookTemplate = async (data: {
  map: any,
  name: string
}) => {
  const {script, css} = await getAssets()
  window.api.copyToClipboard(JSON.stringify(data.map))
  return `
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name}</title>
  <style>${css}</style>
</head>
<body>
<div id="root">
  <header class="header">
    <div class="header-content"><a class="block header-name">${data.name}</a>
      <div class="flex items-center">
        <div class="lg:hidden" id="menu"><span role="img" aria-label="menu"
                                               class="anticon anticon-menu duration-200 hover:text-gray-600 text-gray-500 text-xl"><svg
          data-icon="menu" width="1em" height="1em" fill="currentColor" aria-hidden="true" viewBox="64 64 896 896"><path
          d="M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z"/></svg></span>
        </div>
        <div id="search" class="hidden lg:block relative">
          <div class="relative"><span role="img" aria-label="search"
                                      class="-translate-y-1/2 absolute anticon anticon-search left-2 text-gray-500 top-1/2"><svg
            data-icon="search" width="1em" height="1em" fill="currentColor" aria-hidden="true" viewBox="64 64 896 896"><path
            d="M909.6 854.5 649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0 0 11.6 0l43.6-43.5a8.2 8.2 0 0 0 0-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z"/></svg></span>
            <input placeholder="Search" class="book-search-input" id="input"></div>
          <div id="search-result"
               class="absolute bg-white border border-gray-500/30 dark:bg-zinc-900 hidden max-h-[400px] overflow-y-auto p-3 right-0 rounded-lg space-y-2 top-10 w-full z-50">
            <div class="flex h-20 items-center justify-center p-4" id="search-empty"><span
              class="leading-6 text-center text-gray-400 text-sm"></span></div>
            <div class="space-y-5" id="search-result-list"></div>
          </div>
        </div>
        <div id="theme"
             class="border-gray-200 border-t bottom-0 dark:border-gray-200/20 fixed h-10 hidden items-center justify-center left-0 lg:block lg:border-none lg:h-auto lg:ml-4 lg:static lg:w-auto w-full">
          <svg width="20" aria-hidden="true"
               class="cursor-pointer duration-200 fill-gray-400 hidden hover:fill-gray-200 t-light w-5"
               viewBox="0 0 24 24">
            <path
              d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0-4c-.6 0-1-.4-1-1V1c0-.6.4-1 1-1s1 .4 1 1v2c0 .6-.4 1-1 1zm0 20c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1s1 .4 1 1v2c0 .6-.4 1-1 1zM5.6 6.6c-.3 0-.5-.1-.7-.3L3.5 4.9c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4-.1.2-.4.3-.7.3zm14.2 14.2c-.3 0-.5-.1-.7-.3l-1.4-1.4c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4-.2.2-.5.3-.7.3zM3 13H1c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zm20 0h-2c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zM4.2 20.8c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l1.4-1.4c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-1.4 1.4c-.2.2-.4.3-.7.3zM18.4 6.6c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l1.4-1.4c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-1.4 1.4c-.2.2-.5.3-.7.3z"/>
          </svg>
          <svg width="20" aria-hidden="true"
               class="cursor-pointer duration-200 fill-gray-500 hidden hover:fill-gray-700 t-dark w-5"
               viewBox="0 0 24 24">
            <path
              d="M12.1 22h-.9c-5.5-.5-9.5-5.4-9-10.9.4-4.8 4.2-8.6 9-9 .4 0 .8.2 1 .5.2.3.2.8-.1 1.1-2 2.7-1.4 6.4 1.3 8.4 2.1 1.6 5 1.6 7.1 0 .3-.2.7-.3 1.1-.1.3.2.5.6.5 1-.2 2.7-1.5 5.1-3.6 6.8-1.9 1.4-4.1 2.2-6.4 2.2zM9.3 4.4c-2.9 1-5 3.6-5.2 6.8-.4 4.4 2.8 8.3 7.2 8.7 2.1.2 4.2-.4 5.8-1.8 1.1-.9 1.9-2.1 2.4-3.4-2.5.9-5.3.5-7.5-1.1-2.8-2.2-3.9-5.9-2.7-9.2z"/>
          </svg>
        </div>
      </div>
    </div>
  </header>
  <div class="doc-container">
    <div class="director hidden lg:block"></div>
    <div class="content">
      <div class="real-content"></div>
      <div class="mt-14 page-container"></div>
    </div>
    <div class="leading xl:block">
      <div class="leading-title">On this page</div>
      <div class="leading-list"></div>
    </div>
  </div>
</div>
<script>window.map = ${JSON.stringify(data.map)}</script>
<script>${script}</script>
</body>
</html>
  `
}

const getChapterByConfig = async (ctx: {
  items: ChapterItem[],
  schemaMap: Map<string, {schema: any[], item: IFileItem}>
  config: EbookConfig
}) => {
  const chapters: DocMap[] = []
  for (let c of ctx.items) {
    if (!c.name) throw new Error(configStore.isZh ? 'name字段为空' : 'name field is empty')
    if (c.folder) {
      if (!c.children?.length) continue
      chapters.push({
        ...c,
        id: 'a' + window.api.md5(nanoid()),
        children: await getChapterByConfig({
          ...ctx,
          items: c.children!
        })
      })
    } else {
      if (!c.path) throw new Error(configStore.isZh ? 'path字段为空' : 'path fields empty')
      let realPath = join(treeStore.root.filePath!, c.path!)
      if (!realPath.endsWith('.md')) realPath += '.md'
      if (!(await exist(realPath))) throw new Error(`${c.path} ${configStore.isZh ? '文件不存在' : 'file dose not exist'}`)
      const path = window.api.md5(realPath)
      const item = ctx.schemaMap.get(realPath)
      if (!item) continue
      const content = await transform(item.schema, item.item)
      const outline = getOutline(item.schema)
      const id = 'a' + path
      const chapter: DocMap = {
        folder: false,
        name: c.name,
        id,
        content,
        outline
      }
      currentSections.push({
        section: getSectionTexts(item.schema).sections,
        path: id,
        name: c.name
      })
      chapters.push(chapter)
    }
  }
  return chapters
}
export const exportEbookHtml = async (config: EbookConfig) => {
  currentSections = []
  if (!treeStore.root) return null
  let map:any
  if (config.strategy === 'auto') {
    map = await getMapByAuto(treeStore.root.children!, config.ignorePaths ? config.ignorePaths.split(',') : undefined)
  }
  if (config.strategy === 'custom') {
    const noteSchemaMap = new Map<string, {schema: any[], item: IFileItem}>()
    const stack = treeStore.root.children!.slice()
    while (stack.length) {
      const item = stack.shift()!
      if (item.ext === 'md') {
        noteSchemaMap.set(item.filePath, {
          schema: treeStore.schemaMap.get(item)?.state || [],
          item: item
        })
      }
      if (item.folder) {
        stack.push(...item.children!)
      }
    }
    try {
      map = await getChapterByConfig({
        items: JSON.parse(config.map),
        schemaMap: noteSchemaMap,
        config: config
      })
    } catch (e) {
      if (e instanceof Error) {
        message$.next({
          type: 'error',
          content: e.message || '导出失败'
        })
      }
    }
  }

  const html = await eBookTemplate({
    map: {data: map, sections: currentSections}, name: config.name
  })
  const save = await saveDialog({
    filters: [{name: 'html', extensions: ['html']}]
  })
  if (save.filePath) {
    await window.api.fs.writeFile(save.filePath, html, {encoding: 'utf-8'})
    MainApi.openInFolder(save.filePath)
  }
  return ''
}

export const exportHtml = async (node: IFileItem) => {
  const tree = treeStore.schemaMap.get(node)?.state || []
  const title = parse(node.filePath).name
  const content = await transform(tree, node)
  const {script, css} = await getAssets()
  const outline = getOutline(tree)
  const html = `<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
<div id="root">
  <header class="header">
    <div class="header-content"><a class="block header-name">${title}</a>
      <div class="flex items-center">
        <div class="lg:hidden" id="menu"><span role="img" aria-label="menu"
                                               class="anticon anticon-menu duration-200 hover:text-gray-600 text-gray-500 text-xl"><svg
          data-icon="menu" width="1em" height="1em" fill="currentColor" aria-hidden="true" viewBox="64 64 896 896"><path
          d="M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z"/></svg></span>
        </div>
        <div id="theme"
             class="group-hover:hidden border-gray-200 border-t bottom-0 dark:border-gray-200/20 fixed h-10 hidden items-center justify-center left-0 lg:block lg:border-none lg:h-auto lg:ml-4 lg:static lg:w-auto w-full">
          <svg width="20" aria-hidden="true"
               class="cursor-pointer duration-200 fill-gray-400 hidden hover:fill-gray-200 t-light w-5"
               viewBox="0 0 24 24">
            <path
              d="M12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0-4c-.6 0-1-.4-1-1V1c0-.6.4-1 1-1s1 .4 1 1v2c0 .6-.4 1-1 1zm0 20c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1s1 .4 1 1v2c0 .6-.4 1-1 1zM5.6 6.6c-.3 0-.5-.1-.7-.3L3.5 4.9c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4-.1.2-.4.3-.7.3zm14.2 14.2c-.3 0-.5-.1-.7-.3l-1.4-1.4c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l1.4 1.4c.4.4.4 1 0 1.4-.2.2-.5.3-.7.3zM3 13H1c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zm20 0h-2c-.6 0-1-.4-1-1s.4-1 1-1h2c.6 0 1 .4 1 1s-.4 1-1 1zM4.2 20.8c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l1.4-1.4c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-1.4 1.4c-.2.2-.4.3-.7.3zM18.4 6.6c-.3 0-.5-.1-.7-.3-.4-.4-.4-1 0-1.4l1.4-1.4c.4-.4 1-.4 1.4 0s.4 1 0 1.4l-1.4 1.4c-.2.2-.5.3-.7.3z"/>
          </svg>
          <svg width="20" aria-hidden="true"
               class="cursor-pointer duration-200 fill-gray-500 hidden hover:fill-gray-700 t-dark w-5"
               viewBox="0 0 24 24">
            <path
              d="M12.1 22h-.9c-5.5-.5-9.5-5.4-9-10.9.4-4.8 4.2-8.6 9-9 .4 0 .8.2 1 .5.2.3.2.8-.1 1.1-2 2.7-1.4 6.4 1.3 8.4 2.1 1.6 5 1.6 7.1 0 .3-.2.7-.3 1.1-.1.3.2.5.6.5 1-.2 2.7-1.5 5.1-3.6 6.8-1.9 1.4-4.1 2.2-6.4 2.2zM9.3 4.4c-2.9 1-5 3.6-5.2 6.8-.4 4.4 2.8 8.3 7.2 8.7 2.1.2 4.2-.4 5.8-1.8 1.1-.9 1.9-2.1 2.4-3.4-2.5.9-5.3.5-7.5-1.1-2.8-2.2-3.9-5.9-2.7-9.2z"/>
          </svg>
        </div>
      </div>
    </div>
  </header>
  <div class="doc-container">
    <div class="content">
      <div class="real-content">${content}</div>
    </div>
    <div class="leading xl:block">
      <div class="leading-title">On this page</div>
      <div class="leading-list">${outline}</div>
    </div>
  </div>
</div>
<script>${script}</script>
</body>
</html>
  `
  const save = await saveDialog({
    filters: [{name: 'html', extensions: ['html']}]
  })
  if (save.filePath) {
    await window.api.fs.writeFile(save.filePath, html, {encoding: 'utf-8'})
    MainApi.openInFolder(save.filePath)
  }
}

const getOutline = (schema: any[]) => {
  const list = schema.filter(n => n.level > 1 && n.level < 5).map(h => {
    const id = getHeadId(h)
    return `<div class="leading-item " style="padding-left: ${(h.level - 2) * 16}px;" data-anchor="${id}"><a href="#${id}">${id}</a></div>`
  })
  if (list.length) return list.join('')
  return ''
}
const transform = async (schema: any[], node: IFileItem) => {
  let str = ''
  for (let e of schema) {
    switch (e.type) {
      case 'head':
        const id = getHeadId(e)
        str += `<a href="#${id}" class="heading duration-200 hover:text-sky-500"><h${e.level}><span class="anchor" id="${id}"></span>${await transform(e.children || [], node)}</h${e.level}></a>`
        break
      case 'paragraph':
        str += `<p>${await transform(e.children || [], node)}</p>`
        break
      case 'blockquote':
        str += `<blockquote>${await transform(e.children || [], node)}</blockquote>`
        break
      case 'hr':
        str += '<hr class="m-hr"/>'
        break
      case 'list':
        let tag = e.order ? 'ol' : 'ul'
        str += `<${tag} class="m-list">${await transform(e.children || [], node)}</${tag}>`
        break
      case 'list-item':
        const task = typeof e.checked === 'boolean'
        str += `<li class="m-list-item ${task ? 'task' : ''}">${task ? `<span class="absolute left-0" style="top:7px"><input type="checkbox" ${e.checked ? 'checked' : ''} class="w-[14px] h-[14px] align-baseline"></span>` : ''}${await transform(e.children || [], node)}</li>`
        break
      case 'table':
        let head = ''
        for (let h of e.children[0].children) {
          head += `<th>${await transform(h.children || [], node)}</th>`
        }
        str += `<table><thead><tr>${head}</tr></thead><tbody>${await transform(e.children?.slice(1) || [], node)}</tbody></table>`
        break
      case 'table-row':
        str += `<tr>${await transform(e.children, node)}</tr>`
        break
      case 'table-cell':
        str += `<td>${await transform(e.children, node)}</td>`
        break
      case 'media':
        let url = e.url
        if (e.url && !e.url.startsWith('http')) {
          try {
            const realPath = isAbsolute(e.url) ? e.url : join(treeStore.openNote!.filePath, '..', e.url)
            if (await window.api.fs.lstat(realPath)) {
              const code = await window.api.fs.readFile(realPath, {encoding: 'base64'})
              url = `data:image/${parse(realPath).ext.slice(1)};base64,${code}`
            }
          } catch (e) {}
        }
        str += `<img alt="${e.alt}" src="${url}"/>`
        break
      case 'code':
        const code = e.children.map(n => Node.string(n)).join('\n')
        if (e.language === 'mermaid') {
          const res = await mermaid.render('m' + Math.floor(Math.random() * 1000), code).catch(e => null)
          str += `<div class="mermaid-container pre">${res?.svg}</div>`
        } else if (e.katex) {
          try {
            const res = katex.renderToString(code, {
              strict: false,
              output: 'mathml',
              throwOnError: false,
              displayMode: true,
              macros: {
                "\\f": "#1f(#2)"
              }
            })
            str += `<div class="py-2 mb-4">${res}</div>`
          } catch (e) {}
        } else {
          const code = e.children.map(n => Node.string(n)).join('\n')
          let codeHtml = window.api.highlightCodeToString(code, e.language)
          codeHtml = codeHtml.replace(/<\/?pre[^>]*>/g, '').replace(/<\/?code>/, '')
          str += `<div class="relative mb-3 group code-block">
<div class="absolute z-10 right-2 top-1 flex items-center select-none group-hover:hidden"><div class="text-gray-400 text-xs"><span>${e.language}</span></div></div>
<pre style="padding: 10px 0" class="code-highlight relative tab-${configStore.config.codeTabSize}" data-lang="${e.language}">
<code>${codeHtml}</code>
</pre></div>`
        }
        break
    }
    if (e.text) {
      let text = e.text
      if (e.strikethrough) text = `<del>${text}</del>`
      if (e.bold) text = `<strong>${text}</strong>`
      if (e.code) text = `<code class="inline-code">${text}</code>`
      if (e.italic) text = `<i>${text}</i>`
      if (e.url) {
        let url = e.url
        if (url.startsWith('http')) {
          text = `<a target="_blank" class="link" href="${url}">${text}</a>`
        } else {
          const path = isAbsolute(url) ? window.api.md5(url) : window.api.md5(join(node.filePath, '..', url))
          text = `<a target="_blank" class="link doc" data-id="a${path}">${text}</a>`
        }
      }
      str += text
    }
  }
  return str
}
