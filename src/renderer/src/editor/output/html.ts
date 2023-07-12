import {getHeadId} from '../../share/sync'
import mermaid from 'mermaid'
import {Node} from 'slate'
import {configStore} from '../../store/config'
import {ipcRenderer} from 'electron'
import {join, parse, isAbsolute, extname} from 'path'
import {treeStore} from '../../store/tree'
import {IFileItem} from '../../index'
import {saveDialog} from '../../api/main'
import katex from 'katex'

export const exportHtml = async (node: IFileItem) => {
  const tree = treeStore.schemaMap.get(node)?.state || []
  const title = parse(node.filePath).name
  const env = await ipcRenderer.invoke('get-env') as {webPath: string}
  const content = await transform(tree)
  const libs = await window.api.fs.readdir(join(env.webPath, 'lib'))
  const style = libs.find(l => /index-\w+\.css$/.test(l))
  let styleCode = ''
  if (style) styleCode = await window.api.fs.readFile(join(env.webPath, 'lib', style), {encoding: 'utf-8'})
  const html = `<html lang="en" class="${configStore.config.dark ? 'dark' : ''}">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/svg+xml" href="/icon.png">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styleCode}</style>
</head>
  <body>
    <div id="root">
      <div class="doc-container">
        <div class="content">
          ${content}
        </div>
        ${getOutline(tree)}
      </div>
    </div>
  </body>
</html>
  `
  const save = await saveDialog({
    filters: [{name: 'html', extensions: ['html']}]
  })
  if (save.filePath) {
    window.api.fs.writeFile(save.filePath, html, {encoding: 'utf-8'})
  }
}

const getOutline = (schema: any[]) => {
  const list = schema.filter(n => n.level > 1 && n.level < 5).map(h => {
    const id = getHeadId(h)
    return `<div class="leading-item " style="padding-left: ${(h.level - 2) * 16}px;"><a href="#${id}">${id}</a></div>`
  })
  if (!list.length) return ''
  return `<div class="leading lg:block">
<div class="leading-title">On this page</div>
  <div class="leading-list">
    ${list.join('')}
 </div>`
}
const transform = async (schema: any[]) => {
  let str = ''
  for (let e of schema) {
    switch (e.type) {
      case 'head':
        const id = getHeadId(e)
        str += `<a href="#${id}" class="heading duration-200 hover:text-sky-500"><h${e.level}><span class="anchor" id="${id}" style="top:-10px"></span>${await transform(e.children || [])}</h${e.level}></a>`
        break
      case 'paragraph':
        str += `<p>${await transform(e.children || [])}</p>`
        break
      case 'blockquote':
        str += `<blockquote>${await transform(e.children || [])}</blockquote>`
        break
      case 'hr':
        str += '<hr class="m-hr"/>'
        break
      case 'list':
        let tag = e.order ? 'ol' : 'ul'
        str += `<${tag} class="m-list">${await transform(e.children || [])}</${tag}>`
        break
      case 'list-item':
        const task = typeof e.checked === 'boolean'
        str += `<li class="m-list-item ${task ? 'task' : ''}">${task ? `<span class="absolute left-0" style="top:7px"><input type="checkbox" ${e.checked ? 'checked' : ''} class="w-[14px] h-[14px] align-baseline"></span>` : ''}${await transform(e.children || [])}</li>`
        break
      case 'table':
        let head = ''
        for (let h of e.children[0].children) {
          head += `<th>${await transform(h.children || [])}</th>`
        }
        str += `<table><thead><tr>${head}</tr></thead><tbody>${await transform(e.children?.slice(1) || [])}</tbody></table>`
        break
      case 'table-row':
        str += `<tr>${await transform(e.children)}</tr>`
        break
      case 'table-cell':
        str += `<td>${await transform(e.children)}</td>`
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
          str += `<div class="relative mb-4">
<div class="absolute z-10 right-2 top-1 flex items-center select-none"><div class="text-gray-400 text-xs"><span>${e.language}</span></div></div>
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
      if (e.url) text = `<a href="${e.url}" target="_blank">${text}</a>`
      str += text
    }
  }
  return str
}
