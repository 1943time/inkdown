import {treeStore, TreeStore} from '../store/tree'
import {Range, Editor, Element, Transforms, Path, Node, NodeEntry, Point} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import React from 'react'
import isHotkey from 'is-hotkey'
import {runInAction} from 'mobx'
import {ReactEditor} from 'slate-react'
import {parserMdToSchema} from '../editor/parser/parser'
import {isAbsolute, join, relative} from 'path'
import {configStore} from '../store/config'
import {EditorStore} from '../editor/store'
import {existsSync} from 'fs'
import {message$} from './index'
import {selChange$} from '../editor/plugins/useOnchange'

const openFloatBar = (store: EditorStore) => {
  setTimeout(() => {
    try {
      const domRange = window.getSelection()?.getRangeAt(0)
      const rect = domRange?.getBoundingClientRect()
      if (rect) {
        store.setState(state => state.domRect = rect)
      }
    } catch (e) {
    }
  })
}
const formatList = (editor: Editor, node: NodeEntry<any>, type: string) => {
  const isOrder = ['insertOrderedList', 'insertTaskOrderedList'].includes(type)
  const task = ['insertTaskUnorderedList', 'insertTaskOrderedList'].includes(type)

  if (node && ['paragraph'].includes(node[0].type)) {
    const parent = Editor.parent(editor, node[1])
    if (parent[0].type === 'list-item') {
      Transforms.setNodes(editor, {order: isOrder ? true : undefined}, {at: Path.parent(parent[1])})
      const listItems = Array.from<any>(Editor.nodes(editor, {
        match: n => n.type === 'list-item',
        at: Path.parent(parent[1]),
        reverse: true,
        mode: 'lowest'
      }))
      Transforms.setNodes(editor, {start: undefined}, {at: Path.parent(parent[1])})
      for (let l of listItems) {
        Transforms.setNodes(editor, {checked: task ? l[0].checked || false : undefined}, {at: l[1]})
      }
    } else {
      const text = EditorUtils.cutText(editor, Editor.start(editor, node[1]))
      Transforms.delete(editor, {at: node[1]})
      Transforms.insertNodes(editor, {
          type: 'list', order: isOrder ? true : undefined,
          children: [{
            type: 'list-item',
            checked: task ? false : undefined,
            children: [{type: 'paragraph', children: text}]
          }]
        }, {at: node[1], select: true}
      )
    }
  }
}

export const isMod = (e: MouseEvent | KeyboardEvent | React.KeyboardEvent | React.MouseEvent) => {
  return e.metaKey || e.ctrlKey
}
const insertCode = (editor: Editor, node: NodeEntry<any>, katex?: boolean) => {
  if (node && ['paragraph', 'head'].includes(node[0].type)) {
    const path = node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
    Transforms.insertNodes(editor, {
      type: 'code',
      language: katex ? 'latex' : undefined,
      children: [
        {type: 'code-line', children: [{text: ''}]},
      ],
      katex: katex
    }, {at: path})

    setTimeout(() => {
      let start = Editor.start(editor, path)
      const [entry] = Editor.nodes(editor, {at: path})
      Transforms.select(editor, start)
      if (entry) {
        selChange$.next({
          node: entry, sel: {anchor: start, focus: start}
        })
      }
    }, 16)
  }
}

export class MenuKey {
  timer = 0

  get state() {
    return this.store.currentTab.store
  }

  constructor(
    private readonly store: TreeStore,
  ) {
    window.addEventListener('keydown', e => {
      if (isHotkey('mod+b', e)) this.run('bold')
      if (isHotkey('mod+i', e)) this.run('italic')
      if (isHotkey('mod+0', e)) this.run('paragraph')
      if ((isHotkey('mod+x', e) || isHotkey('mod+c', e)) && this.state && this.state.editor.selection) {
        const [node] = Editor.nodes<any>(this.state.editor, {
          match: n => n.type === 'media'
        })
        const [start, end] = Range.edges(this.state.editor.selection)
        if (node && Path.compare(start.path, node[1]) === 0 && Path.compare(end.path, node[1]) === 0) {
          e.preventDefault()
          const url = node[0].url, currentFilePath = this.store.currentTab.store.openFilePath || ''
          const file = isAbsolute(url) ? url : join(currentFilePath || '', '..', url)
          if (url && currentFilePath && isHotkey('mod+c', e)) {
            if (existsSync(file) && /\.(png|jpeg|jpg)$/.test(file)) {
              window.electron.ipcRenderer.invoke('copy-image', file).then(() => {
                message$.next({
                  type: 'success',
                  content: configStore.zh ? '已将图片复制到剪贴板' : 'Image copied to clipboard'
                })
              })
            }
          } else if (existsSync(file)) {
            window.api.writeClipboardText(file)
          }
          if (isHotkey('mod+x', e)) {
            Transforms.delete(this.state.editor, {at: node[1]})
            ReactEditor.focus(this.state.editor)
          }
        }
      }
    }, false)
    window.electron.ipcRenderer.on('key-task', (e, task: string, other: any) => {
      this.run(task, other)
    })
  }

  run(task: string, other?: any) {
    clearTimeout(this.timer)
    this.timer = window.setTimeout(() => {
      const sel = this.state?.editor.selection
      if (!this.state || !sel) return
      if (['insertNetworkImage', 'insertImage'].includes(task) && sel) {
        const [node] = Editor.nodes<any>(this.state?.editor, {
          match: n => Element.isElement(n),
          mode: 'highest'
        })
        if (node && node[0].type === 'code') return
        if (other && treeStore.root && isAbsolute(other) && treeStore.openedNote) {
          other = relative(join(treeStore.openedNote.filePath, '..'), other)
        }
        if (other) {
          this.state.insertInlineNode(other)
        } else {
          let node = {
            type: 'media',
            url: '',
            alt: '',
            children: [{text: ''}]
          }
          const [cur] = Editor.nodes<any>(this.state.editor, {
            match: n => Element.isElement(n),
            mode: 'lowest'
          })

          if (cur[0].type === 'paragraph') {
            Transforms.insertNodes(this.state.editor, node, {select: true})
          } else {
            const [par] = Editor.nodes<any>(this.state.editor, {
              match: n => Element.isElement(n) && ['table', 'code', 'head'].includes(n.type)
            })
            Transforms.insertNodes(this.state.editor, {
              type: 'paragraph',
              children: [node]
            }, {select: true, at: Path.next(par[1])})
          }
        }
        return
      }

      const editor = this.state.editor
      const [node] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })

      switch (task) {
        case 'head':
          if (node && ['paragraph', 'head'].includes(node[0].type) && EditorUtils.isTop(editor, node[1])) {
            Transforms.setNodes(editor, {type: 'head', level: other}, {at: node[1]})
          }
          break
        case 'head+':
          if (node && ['paragraph', 'head'].includes(node[0].type) && EditorUtils.isTop(editor, node[1])) {
            if (node[0].type === 'paragraph') {
              Transforms.setNodes(editor, {type: 'head', level: 4}, {at: node[1]})
            } else if (node[0].level === 1) {
              Transforms.setNodes(editor, {type: 'paragraph'}, {at: node[1]})
            } else {
              Transforms.setNodes(editor, {level: node[0].level - 1}, {at: node[1]})
            }
          }
          break
        case 'head-':
          if (node && ['paragraph', 'head'].includes(node[0].type) && EditorUtils.isTop(editor, node[1])) {
            if (node[0].type === 'paragraph') {
              Transforms.setNodes(editor, {type: 'head', level: 1}, {at: node[1]})
            } else if (node[0].level === 4) {
              Transforms.setNodes(editor, {type: 'paragraph'}, {at: node[1]})
            } else {
              Transforms.setNodes(editor, {level: node[0].level + 1}, {at: node[1]})
            }
          }
          break
        case 'paragraph':
          if (node && ['head'].includes(node[0].type)) {
            Transforms.setNodes(editor, {type: 'paragraph'}, {at: node[1]})
          }
          break
        case 'quote':
          if (!['paragraph', 'head'].includes(node[0].type)) return
          if (Node.parent(editor, node[1]).type === 'blockquote') {
            Transforms.unwrapNodes(editor, {at: Path.parent(node[1])})
            return
          }
          if (node[0].type === 'head') {
            Transforms.setNodes(editor, {
              type: 'paragraph'
            }, {at: node[1]})
          }
          Transforms.wrapNodes(editor, {
            type: 'blockquote',
            children: []
          })
          break
        case 'insertTable':
          if (node && ['paragraph', 'head'].includes(node[0].type)) {
            const path = node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
            Transforms.insertNodes(editor, {
              type: 'table',
              children: [
                {
                  type: 'table-row',
                  children: [{type: 'table-cell', title: true, children: [{text: ''}]}, {
                    type: 'table-cell',
                    title: true,
                    children: [{text: ''}]
                  }, {type: 'table-cell', title: true, children: [{text: ''}]}]
                },
                {
                  type: 'table-row',
                  children: [{type: 'table-cell', children: [{text: ''}]}, {
                    type: 'table-cell',
                    children: [{text: ''}]
                  }, {type: 'table-cell', children: [{text: ''}]}]
                },
                {
                  type: 'table-row',
                  children: [{type: 'table-cell', children: [{text: ''}]}, {
                    type: 'table-cell',
                    children: [{text: ''}]
                  }, {type: 'table-cell', children: [{text: ''}]}]
                }
              ]
            }, {at: path})

            Transforms.select(editor, Editor.start(editor, path))
          }
          break
        case 'insertCode':
          insertCode(editor, node)
          break
        case 'insertFrontmatter':
          const topNode = Editor.node(editor, [0])
          if (!topNode[0]?.frontmatter) {
            Transforms.insertNodes(editor, {
              type: 'code',
              language: 'yaml',
              children: [
                {type: 'code-line', children: [{text: ''}]},
              ],
              frontmatter: true
            }, {at: [0], select: true})
          } else {
            Transforms.select(editor, Editor.start(editor, [0]))
          }
          break
        case 'insertKatex':
          insertCode(editor, node, true)
          break
        case 'insertInlineKatex':
          Transforms.insertNodes(editor, {
            type: 'inline-katex',
            children: [{text: ''}],
            select: true
          })
          const [katexNode] = Editor.nodes(editor, {
            match: n => n.type === 'inline-katex'
          })
          if (katexNode) {
            setTimeout(() => {
              selChange$.next({
                node: katexNode,
                sel: {anchor: {path: katexNode[1], offset: 0}, focus: {path: katexNode[1], offset: 0}}
              })
            }, 16)
          }
          break
        case 'insertOrderedList':
          formatList(editor, node, task)
          break
        case 'insertTaskOrderedList':
          formatList(editor, node, task)
          break
        case 'insertTaskUnorderedList':
          formatList(editor, node, task)
          break
        case 'insertUnorderedList':
          formatList(editor, node, task)
          break
        case 'insertHorizontalRule':
          if (node && ['paragraph', 'head'].includes(node[0].type)) {
            const path = node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
            Transforms.insertNodes(editor, {
              type: 'hr',
              children: [{text: ''}]
            }, {at: path})
            if (Editor.hasPath(editor, Path.next(path))) {
              Transforms.select(editor, Editor.start(editor, Path.next(path)))
            } else {
              Transforms.insertNodes(editor, {
                type: 'paragraph',
                children: [{text: ''}]
              }, {at: Path.next(path), select: true})
            }
          }
          break
        case 'paste-plain-text':
          const text = window.api.getClipboardText()
          if (text) {
            if (node[0].type === 'code-line') {
              Transforms.insertFragment(editor, text.split('\n').map(c => {
                return {type: 'code-line', children: [{text: c}]}
              }))
              setTimeout(() => {
                runInAction(() => {
                  this.store.currentTab.store!.refreshHighlight = !this.store.currentTab.store!.refreshHighlight
                })
              }, 60)
            } else if (node[0].type === 'table-cell') {
              Editor.insertText(editor, text.replace(/\n/g, ' '))
            } else {
              Editor.insertText(editor, text)
            }
          }
          break
        case 'paste-markdown-code':
          const markdownCode = window.api.getClipboardText()
          if (markdownCode) {
            parserMdToSchema([markdownCode]).then(([schema]) => {
              if (!schema.length) return
              if (configStore.config.autoDownload) {
                const stack = schema.slice()
                while (stack.length) {
                  const item = stack.pop()!
                  if (item.type === 'media' && item.url?.startsWith('http')) {
                    item.downloadUrl = item.url
                  }
                  if (item.children?.length) {
                    stack.push(...item.children)
                  }
                }
              }
              if (node[0].type === 'paragraph' && !Node.string(node[0]) && node[0].children.length === 1) {
                Transforms.delete(editor, {at: node[1]})
                Transforms.insertNodes(editor, schema, {at: node[1]})
                return
              } else if ((schema[0]?.type === 'paragraph' && ['paragraph', 'table-cell'].includes(node[0].type))) {
                const first = schema.shift()
                Editor.insertNode(editor, first.children)
              }
              if (schema.length) {
                if (['code-line', 'table-cell', 'inline-katex'].includes(node[0].type)) {
                  const [block] = Editor.nodes<any>(editor, {
                    match: n => ['table', 'code', 'paragraph'].includes(n.type),
                    mode: 'lowest'
                  })
                  Transforms.insertNodes(editor, schema, {
                    at: Path.next(block[1]),
                    select: true
                  })
                } else {
                  Transforms.insertNodes(editor, schema, {
                    at: Path.next(node[1]),
                    select: true
                  })
                }
              }
            })
          }
          setTimeout(() => {
            runInAction(() => this.state!.refreshHighlight = !this.state!.refreshHighlight)
          }, 100)
          break
        case 'key-break':
          if (node[0].type === 'paragraph') {
            Editor.insertText(editor, '\n')
          }
          if (node[0].type === 'table-cell') {
            Editor.insertNode(editor, {type: 'break', children: [{text: ''}]})
          }
          break
        case 'select-line':
          if (editor.selection) {
            const [node] = Editor.nodes<any>(editor, {mode: 'lowest', match: m => Element.isElement(m)})
            Transforms.select(editor, Path.parent(editor.selection.anchor.path))
            const text = Node.leaf(editor, editor.selection.anchor.path).text || ''
            if (text && node?.[0].type !== 'code-line') {
              openFloatBar(this.state)
            }
          }
          break
        case 'select-format':
          if (editor.selection) {
            const [node] = Editor.nodes<any>(editor, {mode: 'lowest', match: m => Element.isElement(m)})
            Transforms.select(editor, editor.selection.anchor.path)
            if (node?.[0].type !== 'code-line' && editor.selection && !Range.isCollapsed(editor.selection)) openFloatBar(this.state)
          }
          break
        case 'select-word':
          if (sel && Range.isCollapsed(sel)) {
            const text = Node.leaf(editor, sel.anchor.path).text || ''
            let start = sel.anchor.offset
            let end = start
            const next = text.slice(start)
            const pre = text.slice(0, start)
            let m1 = next.match(/^(\w+)/)
            if (m1) {
              end += m1[1].length
              let m2 = pre.match(/(\w+)$/)
              if (m2) start = start - m2[1].length
            } else {
              m1 = next.match(/^([\u4e00-\u9fa5]+)/)
              if (m1) {
                end += m1[1].length
                let m2 = pre.match(/([\u4e00-\u9fa5]+)$/)
                if (m2) start = start - m2[1].length
              } else {
                let m2 = pre.match(/(\w+)$/)
                if (!m2) m2 = pre.match(/([\u4e00-\u9fa5]+)$/)
                if (m2) start -= m2[1].length
              }
            }
            if (start === sel.anchor.offset && end === sel.anchor.offset && next) {
              end = start + 1
            }
            Transforms.select(editor, {
              anchor: {path: sel.anchor.path, offset: start},
              focus: {path: sel.anchor.path, offset: end}
            })
            const [node] = Editor.nodes<any>(editor, {mode: 'lowest', match: m => Element.isElement(m)})
            if (node?.[0].type !== 'code-line' && editor.selection && !Range.isCollapsed(editor.selection)) openFloatBar(this.state)
          }
          break
      }

      if (!Path.equals(Path.parent(sel.focus.path), Path.parent(sel.anchor.path)) || node[0].type === 'code-line') return
      switch (task) {
        case 'bold':
          this.format('bold')
          break
        case 'italic':
          this.format('italic')
          break
        case 'strikethrough':
          this.format('strikethrough')
          break
        case 'code':
          this.format('code')
          break
        case 'link':
          this.state.floatBar$.next('link')
          break
        case 'highlight':
          this.state.floatBar$.next('highlight')
          break
        case 'clear':
          EditorUtils.clearMarks(this.state.editor, !Range.isCollapsed(sel))
          break
      }
    }, 40)
  }

  format(type: string) {
    EditorUtils.toggleFormat(this.state!.editor, type)
  }
}
