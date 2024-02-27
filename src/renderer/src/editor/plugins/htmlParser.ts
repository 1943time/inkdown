import {Editor, Element, Node, Path, Range, Transforms} from 'slate'
import {jsx} from 'slate-hyperscript'
import {BackspaceKey} from './hotKeyCommands/backspace'
import {configStore} from '../../store/config'

const findElementByNode = (node: ChildNode) => {
  const index = Array.prototype.indexOf.call(node.parentNode!.childNodes, node)
  return node.parentElement!.children[index] as HTMLElement
}
const fragment = new Set(['body', 'figure', 'div'])
const ELEMENT_TAGS = {
  BLOCKQUOTE: () => ({type: 'blockquote'}),
  H1: () => ({type: 'head', level: 1}),
  H2: () => ({type: 'head', level: 2}),
  H3: () => ({type: 'head', level: 3}),
  H4: () => ({type: 'head', level: 4}),
  H5: () => ({type: 'head', level: 5}),
  TABLE: () => ({type: 'table'}),
  IMG: (el: HTMLImageElement) => {
    return {type: 'media', url: el.src, downloadUrl: configStore.config.autoDownload && el.src && /^https?:/.test(el.src) ? el.src : undefined }
  },
  TR: () => ({type: 'table-row'}),
  TH: () => ({type: 'table-cell', title: true}),
  TD: () => ({type: 'table-cell'}),
  LI: () => ({type: 'list-item'}),
  OL: () => ({type: 'list', order: true}),
  P: () => ({type: 'paragraph'}),
  PRE: () => ({type: 'code'}),
  UL: () => ({type: 'list'}),
}

const TEXT_TAGS = {
  A: (el: HTMLElement) => ({url: el.getAttribute('href')}),
  CODE: () => ({code: true}),
  KBD: () => ({code: true}),
  SPAN: (el: HTMLElement) => ({text: el.textContent}),
  DEL: () => ({strikethrough: true}),
  EM: () => ({italic: true}),
  I: () => ({italic: true}),
  S: () => ({strikethrough: true}),
  STRONG: () => ({bold: true}),
  B: () => ({bold: true})
}

export const deserialize = (el: ChildNode, parentTag: string = '') => {
  if (el.nodeName.toLowerCase() === 'noscript') return []
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
    target = el.childNodes[0]
  }
  let children = Array.from(target.childNodes)
    .map(n => {
      return deserialize(n, target.nodeName.toLowerCase().toLowerCase())
    })
    .flat()

  if (children.length === 0) {
    children = [{text: el.textContent || ''}]
  }

  if (fragment.has((el.nodeName.toLowerCase()))) {
    return jsx('fragment', {}, children)
  }
  if (TEXT_TAGS[nodeName] && Array.from(el.childNodes).some(e => e.nodeType !== 3 && !TEXT_TAGS[e.nodeName])) {
    return jsx('fragment', {}, children)
  }
  if (ELEMENT_TAGS[nodeName]) {
    if (!parentTag || !['h1', 'h2', 'code', 'h3', 'h4', 'h5', 'th', 'td'].includes(parentTag)) {
      if (nodeName === 'PRE') {
        const dom = findElementByNode(el)
        const dataset = dom.dataset
        const inner = dataset?.blType === 'code'
        if (inner) {
          return {
            type: 'code', language: dataset?.blLang, children: Array.from(target.childNodes.values()).map(n => {
              return {type: 'code-line', children: [{text: n.textContent?.replace(/\n/g, '')?.replace(/\t/g, configStore.tab) || ''}]}
            })
          }
        } else {
          const text = parserCodeText(findElementByNode(target))
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
    return children.map(child => {
      return jsx('text', attrs, child)
    }).filter(c => !!c.text)
  }
  return children
}

const parserCodeText = (el: HTMLElement) => {
  el.innerHTML = el.innerHTML.replace(/<br\/?>|<\/div>(?=\S)/g, '\n')
  return el.innerText
}

const getTextsNode = (nodes: any[]) => {
  let text: any[] = []
  for (let n of nodes) {
    if (n.text) {
      text.push(n)
    }
    if (n?.children) {
      text.push(...getTextsNode(n.children))
    }
  }
  return text
}

const processFragment = (fragment: any[], parentType = '') => {
  let trans:any[] = []
  let container: null | any = null
  for (let f of fragment) {
    if (f.text) {
      f.text = f.text.replace(/^\n+|\n+$/g, '')
      if (!f.text) continue
    }
    if ((['media', 'link'].includes(f.type) || f.text) && !['paragraph', 'table-cell', 'head'].includes(parentType)) {
      if (!container) {
        f = {type: 'paragraph', children: [f]}
        container = f
        trans.push(container)
      } else {
        container.children.push(f)
      }
      continue
    }
    if (f.type === 'list-item' && parentType !== 'list') {
      if (!container) {
        container = {type: 'list', children: [f]}
        trans.push(container)
      } else {
        container.children.push(f)
      }
      continue
    }
    if (f.children && f.type && f.type !== 'code') {
      f.children = processFragment(f.children, f.type)
      if (!f.children?.length) continue
    }
    trans.push(f)
  }
  return trans
}
export const htmlParser = (editor: Editor, html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html').body
  const inner = !!parsed.querySelector('[data-be]')
  const sel = editor.selection
  let fragment = processFragment(deserialize(parsed))
  if (!fragment?.length) return
  let [node] = Editor.nodes<Element>(editor, {
    match: n => Element.isElement(n)
  })
  if (sel) {
    if (!Range.isCollapsed(sel)) {
      const back = new BackspaceKey(editor)
      back.range()
      Transforms.select(editor, Range.start(sel))
      setTimeout(() => {
        const node = Editor.node(editor, [0])
        if (editor.children.length > 1 && node[0].type === 'paragraph' && !Node.string(node[0])) {
          Transforms.delete(editor, {at: [0]})
        }
      })
    }
    const [n] = Editor.nodes<Element>(editor, {
      match: n => Element.isElement(n) && ['code', 'table-cell', 'head', 'list-item', 'inline-katex'].includes(n.type),
      at: Range.isCollapsed(sel) ? sel.anchor.path : Range.start(sel).path
    })
    if (n) node = n
    if (node) {
      if (node[0].type ==='list-item' && fragment[0].type === 'list') {
        const children = fragment[0].children || []
        if (!children.length) return false
        const [p] = Editor.nodes<Element>(editor, {
          match: n => Element.isElement(n) && n.type === 'paragraph',
          at: Range.isCollapsed(sel) ? sel.anchor.path : Range.start(sel).path
        })
        if (n && !Path.hasPrevious(p[1])) {
          if (!Node.string(p[0])) {
            Transforms.insertNodes(editor, children, {at: Path.next(n[1])})
            const parent = Node.parent(editor, p[1])
            const nextPath = [...n[1].slice(0, -1), n[1][n[1].length - 1] + children.length]
            if (parent.children.length > 1) {
              Transforms.moveNodes(editor, {
                at: {
                  anchor: {path: Path.next(p[1]), offset: 0},
                  focus: {path: [...p[1].slice(0, -1), parent.children.length - 1], offset: 0}
                },
                to: [...nextPath, 1]
              })
            }
            Transforms.delete(editor, {at: n[1]})
            Transforms.select(editor, Editor.end(editor, [...nextPath.slice(0, -1), nextPath.pop() - 1]))
          } else {
            Transforms.insertNodes(editor, children, {at: Path.next(n[1])})
            Transforms.select(editor, Editor.end(editor, [...n[1].slice(0, -1), n[1].pop()! + children.length]))
          }
          if (fragment.length > 1) {
            Transforms.insertNodes(editor, fragment.slice(1), {at: Path.next(Path.parent(n[1]))})
          }
          return true
        }
      }
      if (node[0].type === 'inline-katex') {
        let text = parsed.innerText
        if (text) {
          Editor.insertText(editor, text.replace(/\n/g, ' '))
        }
        return true
      }
      if (node[0].type === 'table-cell') {
        Transforms.insertFragment(editor, getTextsNode(fragment))
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
  if (inner && !['code', 'code-line', 'table-cell'].includes(node?.[0].type)) return false

  Transforms.insertFragment(editor, fragment)
  return true
}
