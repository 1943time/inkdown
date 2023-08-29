import {treeStore, TreeStore} from '../store/tree'
import {Range, Editor, Element, Transforms, Path, Node, NodeEntry} from 'slate'
import {EditorUtils} from '../editor/utils/editorUtils'
import React from 'react'
import isHotkey from 'is-hotkey'
import {outputCache} from '../editor/output'

const formatList =  (editor: Editor, node: NodeEntry<any>, type: string) => {
  const isOrder = ['insertOrderedList', 'insertTaskOrderedList'].includes(type)
  const task = ['insertTaskUnorderedList', 'insertTaskOrderedList'].includes(type)

  if (node && ['paragraph'].includes(node[0].type)) {
    const parent = Editor.parent(editor, node[1])
    if (parent[0].type === 'list-item') {
      Transforms.setNodes(editor, {order: isOrder ? true : undefined}, {at: Path.parent(parent[1])})
      const [list] = Editor.nodes<any>(editor, {
        match: n => n.type === 'list'
      })

      if (list) outputCache.delete(list[0])
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
        }, {at: node[1]}
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
      if (task === 'insertImage' && sel && other) {
        const [node] = Editor.nodes<any>(this.state?.editor, {
          match: n => Element.isElement(n),
          mode: 'highest'
        })
        if (node && node[0].type === 'code') return
        this.state.insertInlineNode(other)
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
        case 'insertTable':
          if (node && ['paragraph', 'head'].includes(node[0].type)) {
            const path = node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
            Transforms.insertNodes(editor, {
              type: 'table',
              children: [
                {type:'table-row', children: [{type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}, {type: 'table-cell', children: [{text: ''}]}]},
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
        case 'insertKatex':
          insertCode(editor, node, true)
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
