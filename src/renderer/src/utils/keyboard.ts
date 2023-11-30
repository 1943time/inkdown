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

const formatList =  (editor: Editor, node: NodeEntry<any>, type: string) => {
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

      for (let l of listItems) {
        Transforms.setNodes(editor, {checked: task ? l[0].checked || false : undefined}, {at: l[1]})
      }
    } else {
      const text = EditorUtils.cutText(editor, Editor.start(editor, node[1]))
      Transforms.delete(editor, {at: node[1]})
      Transforms.insertNodes(editor, {
          type: 'list', order: isOrder ? true : undefined,
          children: [{type: 'list-item', checked: task ? false : undefined, children: [{type: 'paragraph', children: text}]}]
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
      language: katex ? 'latex': undefined,
      children: [
        {type:'code-line', children: [{text: ''}]},
      ],
      katex: katex
    }, {at: path})

    Transforms.select(editor, Editor.start(editor, path))
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
          window.api.writeClipboardText(`bsc::${node[0].url}`)
          if (isHotkey('mod+x', e)) {
            Transforms.delete(this.state.editor, {at: node[1]})
          }
          ReactEditor.focus(this.state.editor)
        }
      }
      if (isHotkey('enter', e) && this.state) {
        const [node] = Editor.nodes<any>(this.state.editor, {
          match: n => n.type === 'media'
        })
        if (node) {
          e.preventDefault()
          Transforms.select(this.state.editor, {
            path: Path.next(node[1]),
            offset: 0
          })
          ReactEditor.focus(this.state.editor)
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
                {type:'table-row', children: [{type: 'table-cell', title: true, children: [{text: ''}]}, {type: 'table-cell', title: true, children: [{text: ''}]}, {type: 'table-cell', title: true, children: [{text: ''}]}]},
                {type:'table-row', children: [{type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}]},
                {type:'table-row', children: [{type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}]}
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
                {type:'code-line', children: [{text: ''}]},
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
            children: [{text: ''}]
          }, {select: true})
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
              if ((schema[0]?.type === 'paragraph' && ['paragraph', 'table-cell'].includes(node[0].type))) {
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
      }

      if (Range.isCollapsed(sel) || !Path.equals(Path.parent(sel.focus.path), Path.parent(sel.anchor.path)) || node[0].type === 'code-line') return
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
        case 'clear':
          EditorUtils.clearMarks(this.state.editor, true)
          break
      }
    }, 40)
  }
  format(type: string) {
    EditorUtils.toggleFormat(this.state!.editor, type)
  }
}
