import {Editor, Element, Node, Path, Range, Transforms} from 'slate'
import {jsx} from 'slate-hyperscript'

const ELEMENT_TAGS = {
  BLOCKQUOTE: () => ({type: 'blockquote'}),
  H1: () => ({type: 'head', level: 1}),
  H2: () => ({type: 'head', level: 2}),
  H3: () => ({type: 'head', level: 3}),
  H4: () => ({type: 'head', level: 4}),
  H5: () => ({type: 'head', level: 5}),
  TABLE: () => ({type: 'table'}),
  TR: () => ({type: 'table-row'}),
  TH: () => ({type: 'table-cell', title: true}),
  TD: () => ({type: 'table-cell'}),
  // IMG: el => ({ type: 'image', url: el.getAttribute('src') }),
  LI: () => ({type: 'list-item'}),
  OL: () => ({type: 'list', order: true}),
  P: () => ({type: 'paragraph'}),
  PRE: () => ({type: 'code'}),
  UL: () => ({type: 'list'}),
}

const TEXT_TAGS = {
  A: (el: HTMLElement) => ({url: el.getAttribute('href')}),
  CODE: () => ({code: true}),
  SPAN: (el: HTMLElement) => ({text: el.textContent}),
  DEL: () => ({strikethrough: true}),
  EM: () => ({italic: true}),
  I: () => ({italic: true}),
  S: () => ({strikethrough: true}),
  STRONG: () => ({bold: true})
}

export const deserialize = (el: HTMLElement, parentTag: string = '') => {
  if (el.nodeType === 3) {
    return el.textContent
  } else if (el.nodeType !== 1) {
    return null
  } else if (el.nodeName === 'BR') {
    return '\n'
  }

  const {nodeName} = el
  let target = el

  if (
    nodeName === 'PRE' &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === 'CODE'
  ) {
    target = el.children[0] as HTMLElement
  }
  let children = Array.from(target.children)
    .map(n => {
      return deserialize(n as HTMLElement, target.tagName.toLowerCase())
    })
    .flat()

  if (children.length === 0) {
    children = [{text: el.textContent || ''}]
  }

  if (el.nodeName === 'BODY') {
    return jsx('fragment', {}, children)
  }
  if (ELEMENT_TAGS[nodeName]) {
    if (!parentTag || !['h1', 'h2', 'code', 'h3', 'h4', 'h5', 'th', 'td'].includes(parentTag)) {
      if (nodeName === 'PRE') {
        const dataset = el.dataset
        const inner = dataset?.blType === 'code'
        if (inner) {
          return {
            type: 'code', language: dataset?.blLang, children: Array.from(target.childNodes.values()).map(n => {
              return {type: 'code-line', children: [{text: n.textContent?.replace(/\n/g, '') || ''}]}
            })
          }
        } else {
          const text = parserCodeText(target)
          if (text) {
            return {
              type: 'code', children: text.split('\n').map(c => {
                return {type: 'code-line', children: [{text: c}]}
              })
            }
          }
        }
        return
      }
      const attrs = ELEMENT_TAGS[nodeName](el)
      return jsx('element', attrs, children)
    }
  }
  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName](el)
    return children.map(child => jsx('text', attrs, child)).filter(c => !!c.text)
  }
  return children
}

const parserCodeText = (el: HTMLElement) => {
  el.innerHTML = el.innerHTML.replace(/<br\/?>|<\/div>(?=\S)/g, '\n')
  return el.innerText
  // let str = ''
  // for (let c of el.children) {
  //   console.log('el', c, c.nodeName)
  //   if (c.nodeType === 3) {
  //     str += c.textContent
  //   } else if (['a', 'span', 'strong', 'code', 'i', 's', 'font', 'em', 'del'].includes(c.nodeName.toLowerCase())) {
  //     str += c.textContent
  //   } else if ('br' === c.nodeName.toLowerCase()) {
  //     str += '\n'
  //   } else {
  //     if (str && !str.endsWith('\n')) str += '\n'
  //     if (c.children?.length) {
  //       str += parserCodeText(c as HTMLElement)
  //     } else if (c.textContent) {
  //       str += c.textContent
  //     }
  //   }
  // }
  // return str
}

const getTextNode = (nodes: any[]) => {
  let text: any[] = []
  for (let n of nodes) {
    if (n.text) {
      text.push(n)
    }
    if (n?.children) {
      text.push(...getTextNode(n.children))
    }
  }
  return text
}

const processFragment = (fragment: any[]) => {
  let trans:any[] = []
  let list:any = null
  for (let f of fragment) {
    if (f.type === 'list-item') {
      if (!list) {
        list = {type: 'list', children: [f]}
      } else {
        list.children.push(f)
      }
    } else {
      if (list) {
        trans.push(list)
        list = null
      }
      trans.push(f)
    }
  }
  if (list) {
    trans.push(list)
  }
  return trans
}
export const htmlParser = (editor: Editor, html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html').body
  const inner = !!parsed.querySelector('[data-be]')
  parsed.querySelectorAll('span.select-none').forEach(el => {
    el.remove()
  })
  const sel = editor.selection
  let fragment = processFragment(deserialize(parsed))
  if (!fragment?.length) return
  if (sel) {
    const [node] = Editor.nodes<Element>(editor, {
      match: n => Element.isElement(n) && ['code', 'table-cell', 'head', 'list-item'].includes(n.type),
      at: Range.isCollapsed(sel) ? sel.anchor.path : Range.start(sel).path
    })
    if (node) {
      if (node[0].type === 'code') {
        let text = parserCodeText(parsed)
        if (text) {
          Transforms.insertFragment(editor, text.split('\n').map(c => {
            return {type: 'code-line', children: [{text: c}]}
          }))
        }
        return true
      }
      if (node[0].type === 'table-cell') {
        Transforms.insertFragment(editor, getTextNode(fragment))
        return true
      }
      if (node[0].type === 'head') {
        if (fragment[0].type) {
          if (fragment[0].type !== 'paragraph') {
            Transforms.insertNodes(editor, {
              type: 'paragraph', children: [{text: ''}]
            }, {at: Path.next(node[1]), select: true})
            return false
          } else {
            return false
          }
        } else {
          const texts = fragment.filter(c => c.text)
          if (texts.length) {
            Transforms.insertNodes(editor, texts)
            return true
          }
        }
        return false
      }
    }
  }
  console.log('task', parsed.querySelector('.m-list-item.task'))
  if (inner && !parsed.querySelector('.m-list-item.task')) return false
  console.log('frag', fragment)
  Transforms.insertFragment(editor, fragment)
  return true
}
