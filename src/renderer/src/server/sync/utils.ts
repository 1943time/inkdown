import {existsSync, statSync} from 'fs'
import {toUnix} from 'upath'
import {Node} from 'slate'
import {slugify} from '../../utils/sections'
export const isExist = (filePath: string) => {
  try {
    return existsSync(filePath)
  } catch (e) {
    return false
  }
}

export const stat = (filePath: string) => {
  try {
    return statSync(filePath)
  } catch (e) {
    return null
  }
}

export const getFileSize = (filePath: string) => {
  try {
    return statSync(filePath).size
  } catch (e) {
    return 0
  }
}

export const toPath = (root: string, filePath: string) => {
  return trimSlash(toUnix(filePath.replace(root, ''))
    .replace(/\.\w+$/, ''))
    .split('/').map(item => slugify(item)).join('/')
}

export const trimSlash = (str: string) => str.replace(/^\/|\/$/g, '')

type Text = {
  type: string
  text: string
  path: number[]
}

export const schemaToTexts = (schema: any[], parentPath: number[] = []) => {
  let texts: Text[] = []
  for (let i = 0; i < schema.length; i++) {
    const s = schema[i]
    if (['head', 'paragraph', 'table-cell', 'code-line', 'footnoteDefinition'].includes(s.type)) {
      const text = Node.string(s)
      if (text) {
        if (s.type === 'footnoteDefinition') {
          texts.push({
            type: 'paragraph',
            path: [...parentPath, i],
            text: text
          })
        } else {
          texts.push({
            type: s.type,
            path: [...parentPath, i],
            text: text
          })
        }
      }
    } else if (s.children?.length) {
      if (s.type === 'code' && (s.language === 'mermaid' || s.katex || s.render)) continue
      texts.push(...schemaToTexts(s.children, [...parentPath, i]))
    }
  }
  return texts
}
