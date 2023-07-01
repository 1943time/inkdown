import {remove as removeDiacritics} from 'diacritics'
import {CustomLeaf, Elements} from '../el'

const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g

const ignoreNode = ['html']
const spaceNode = ['table-cell']
const blockNode = ['table', 'head', 'paragraph', 'list', 'blockquote', 'list-item', 'table-row', 'code', 'hr', 'code-line']

type Els = Elements & CustomLeaf

const findSectionNodeText = (node: any) => {
  const stack = [node]
  let navText = ''
  while(stack.length) {
    const cn = stack.shift()!
    if (ignoreNode.includes(cn.type)) break
    if (blockNode.includes(cn.type)) {
      if (!navText.endsWith('\n')) {
        navText += '\n'
      }
    } else if (spaceNode.includes(cn.type)) {
      navText += ' '
    }
    if (['code'].includes(cn.type)) {
      if (cn.language !== 'mermaid') {
        navText += cn.code as string
      }
    }
    if (cn.type === 'code-line') continue
    if (cn.text) navText += cn.text
    if (cn.children?.length) {
      stack.unshift(...cn.children)
    }
  }
  return navText.replace(/^\n+|\n+$/g, '').replace(/\n+/, '\n')
}
export const getSectionTexts = (schema: any[]) => {
  let sections:{
    tag: 'h1' | 'h2' | 'all' | 'h3',
    title?: string
    text: string
  }[] = [{
    tag: 'all', text: ''
  }]
  let curSection = sections[0]
  for (let node of schema) {
    if (node.type === 'head' && node.level < 4) {
      curSection = {
        tag: `h${node.level}` as any,
        title: node.id,
        text: ''
      }
      sections.push(curSection)
    } else {
      let str = findSectionNodeText(node)
      if (str) {
        if (blockNode.includes(node.type) && !!curSection.text) {
          str = '\n' + str
        }
        curSection.text += str
      }
    }
  }
  return {
    sections: sections.filter(s => s.text || s.title),
  }
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

export const findText = (node: any) => {
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
