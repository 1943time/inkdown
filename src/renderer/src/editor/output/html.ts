import mermaid from 'mermaid'
import {Node} from 'slate'
import {ipcRenderer} from 'electron'
import {isAbsolute, join, parse, sep} from 'path'
import {treeStore} from '../../store/tree'
import {IFileItem} from '../../index'
import {MainApi, saveDialog} from '../../api/main'
import katex from 'katex'
import {findText, getHeadId} from '../../utils/sections'

const icon = 'data:image/png;base64,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'
const exist = async (path: string) => {
  try {
    await window.api.fs.stat(path)
    return true
  } catch (e) {
    return false
  }
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
  <link rel="icon" href="${icon}">
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
<div id="root">
  <header class="header">
    <div class="header-content ">
      <div class="header-name">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"
             class="w-5 h-5 fill-gray-700 dark:fill-gray-300 mr-1">
          <path
            d="M277-279h275v-60H277v60Zm0-171h406v-60H277v60Zm0-171h406v-60H277v60Zm-97 501q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm0-600v600-600Z"></path>
        </svg>
        <a class="max-w-[calc(100vw_-_170px)] truncate leading-6" href="" id="title">${title}</a>
      </div>
      <div class="items-center flex">
        <div id="outline" class="header-icon lg:flex hidden p-1.5 "><span role="img" aria-label="unordered-list"
                                                             class="anticon anticon-unordered-list"><svg
          viewBox="64 64 896 896" focusable="false" data-icon="unordered-list" width="1em" height="1em"
          fill="currentColor" aria-hidden="true"><path
          d="M912 192H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0 284H328c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h584c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zM104 228a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0zm0 284a56 56 0 10112 0 56 56 0 10-112 0z"></path></svg></span>
        </div>
      </div>
    </div>
  </header>
  <div class="doc-container">
    <div class="content">
      <div class="real-content">${content}</div>
    </div>
    <div class="leading-container lg:block">
      <div class="leading">
      <div class="leading-title">Table of Contents</div>
        <div class="leading-list">
          ${outline}
        </div>
      </div>
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
    return `<a class="leading-item block" style="padding-left:${(h.level - 2) * 16}px" href="#${id}">${findText(h)}</a>`
  })
  if (list.length) return list.join('')
  return ''
}
const transform = async (schema: any[], node: IFileItem, path:number[] = []) => {
  let str = ''
  for (let i = 0; i < schema.length; i++) {
    const e = schema[i]
    const next = [...path, i]
    const nextPath = next.join('-')
    switch (e.type) {
      case 'head':
        const id = getHeadId(e)
        str += `<h${e.level} class="heading" data-index="${nextPath}"><span class="anchor" id="${id}"></span><a class="inline-block" href="#${id}">${await transform(e.children || [], node, next)}</a></h${e.level}>`
        break
      case 'paragraph':
        str += `<p data-index="${nextPath}">${await transform(e.children || [], node, next)}</p>`
        break
      case 'blockquote':
        str += `<blockquote>${await transform(e.children || [], node, next)}</blockquote>`
        break
      case 'hr':
        str += '<hr class="m-hr"/>'
        break
      case 'list':
        let tag = e.order ? 'ol' : 'ul'
        str += `<${tag} class="m-list">${await transform(e.children || [], node, next)}</${tag}>`
        break
      case 'list-item':
        const task = typeof e.checked === 'boolean'
        str += `<li class="m-list-item ${task ? 'task' : ''}">${task ? `<span class="absolute left-0" style="top:7px"><input type="checkbox" ${e.checked ? 'checked' : ''} class="w-[14px] h-[14px] align-baseline"></span>` : ''}${await transform(e.children || [], node, next)}</li>`
        break
      case 'table':
        let head = ''
        for (let j = 0; j < e.children[0].children.length; j++) {
          const h = e.children[0].children[j]
          head += `<th data-index="${[...next, 0, j].join('-')}">${await transform(h.children || [], node, next)}</th>`
        }
        str += `<table><thead><tr>${head}</tr></thead><tbody>${await transform(e.children?.slice(1) || [], node, next)}</tbody></table>`
        break
      case 'table-row':
        str += `<tr>${await transform(e.children, node, next)}</tr>`
        break
      case 'table-cell':
        str += `<td data-index="${nextPath}">${await transform(e.children, node, next)}</td>`
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
          str += `
          <div
            data-index="3"
            class="group tab-2 code-highlight">
            <div class="absolute z-10 right-2 top-1 flex items-center select-none">
              <div class="duration-200 hover:text-sky-500 cursor-pointer text-gray-400 text-xs">
                <span>${e.language || ''}</span>
              </div>
            </div>
            <pre class="text-gray-200"><code>${codeHtml}</code></pre>
          </div>
          `
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
