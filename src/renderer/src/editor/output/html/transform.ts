import {Node} from 'slate'
import {slugify} from '../../../utils/sections'
import mermaid from 'mermaid'
import {configStore} from '../../../store/config'
import katex from 'katex'
import {EditorUtils} from '../../utils/editorUtils'
import {extname, isAbsolute, join} from 'path'
import {existsSync, readFileSync} from 'fs'
import {mediaType} from '../../utils/dom'
const langMap = new Map([
  ['c++', 'cpp']
])
export const codeLangMap = (lang: string) => {
  return langMap.get(lang) || lang
}
export const transformSchema = async (schema: any[], filePath: string) => {
  const data = JSON.parse(JSON.stringify(schema)) as any[]
  const stack = data.slice()
  while (stack.length) {
    const item = stack.shift()!
    if (item.type === 'media') {
      const type = mediaType(item.url)
      try {
        if (!item.url.startsWith('http') && !item.url.startsWith('file:') && !item.url.startsWith('data:')) {
          const path = isAbsolute(item.url) ? item.url : join(filePath, '..', item.url)
          if (existsSync(path) && type === 'image') {
            const base64 = readFileSync(filePath, {'encoding': 'base64'})
            item.url = `data:image/${extname(filePath).slice(1)};base64,${base64}`
          }
        }
        item.mediaType = type
      } catch (e) {}
    }
    if (item.type === 'paragraph') {
      const children:any[] = []
      for (let c of item.children) {
        if (!EditorUtils.isDirtLeaf(c) && c.text) {
          const texts = c.text.split(/\[\^[^\]]+]:?/)
          if (texts.length > 1) {
            let index = 0
            for (let t of texts) {
              index += t.length
              children.push({
                text: t
              })
              const m = c.text.slice(index).match(/\[\^([^\]]+)]:?/)
              if (m) {
                index += m[0].length
                children.push({
                  type: m[0].endsWith(':') ? 'footnoteDefinition' : 'footnoteReference',
                  identifier: m[1],
                  children: []
                })
              }
            }
          } else {
            children.push(c)
          }
        } else {
          children.push(c)
        }
      }
      item.children = children
    }
    if (item.type === 'head') {
      const str = Node.string(item)
      item.id = slugify(str)
      item.title = str
    }
    if (item.type === 'inline-katex') {
      try {
        item.html = katex.renderToString(Node.string(item), {
          strict: false,
          output: 'html',
          throwOnError: false,
          macros: {
            "\\f": "#1f(#2)"
          }
        })
      } catch (e) {}
    }
    if (item.type === 'code') {
      try {
        const code = item.children?.map(n => Node.string(n)).join('\n') || ''
        if (item.language === 'mermaid') {
          const dark = configStore.config.dark
          await mermaid.init({
            theme: 'light'
          })
          item.html = await mermaid.render('m' + (Date.now() + Math.ceil(Math.random() * 1000)), code).then(res => res.svg)
          if (dark) {
            mermaid.init({
              theme: 'dark'
            })
          }
        } else if (item.katex) {
          item.html = katex.renderToString(code, {
            strict: false,
            output: 'mathml',
            throwOnError: false,
            displayMode: true,
            macros: {
              "\\f": "#1f(#2)"
            }
          })
        } else {
          item.code = code
          const lang = codeLangMap(item.language)
          if (window.api.langSet.has(lang)) {
            item.html = window.api.highlightCodeToString(item.code, lang).replace(/<\/?pre[^>]*>/g, '')
          }
        }
      } catch (e) {}
    } else if (item.children?.length) {
      stack.unshift(...item.children)
    }
  }
  return data
}
