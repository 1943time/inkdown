import React from 'react'
import { BasePoint, Editor, Element, Node, NodeEntry, Path, Point, Range, Text, Transforms } from 'slate'
import { CodeLineNode, NodeTypes, ParagraphNode, TableCellNode } from '../../../types/el'
import { CoreStore } from '../../../store/core'

export class TabKey {
  constructor(
    private readonly core: CoreStore,
    private readonly editor: Editor
  ) {}

  run(e: React.KeyboardEvent) {
    const sel = this.editor.selection
    if (!sel) return
    e.preventDefault()
    if (Range.isCollapsed(sel)) {
      const [node] = Editor.nodes<any>(this.editor, {
        match: n => Element.isElement(n) && ['table-cell', 'paragraph'].includes(n.type),
        mode: 'lowest'
      })
      if (sel) {
        if (node) {
          const [el, path] = node
          switch (node[0].type as NodeTypes) {
            case 'table-cell':
              if (this.tableCell(el, path, e.shiftKey)) return
              break
            case 'paragraph':
              const parent = Editor.parent(this.editor, node[1])
              if (parent && parent[0].type === 'list-item') {
                if (this.listItem(node, e)) return
              }
              break
          }
        }
      }
      if (e.shiftKey) {
        const [leaf] = Editor.nodes(this.editor, {
          match: n => Text.isText(n)
        })
        if (leaf) {
          const str = Node.string(leaf[0])
          if (str && /^\t/.test(str)) {
            Transforms.insertText(this.editor, '', {
              at: {
                anchor: {path: leaf[1], offset: 0},
                focus: {path: leaf[1], offset: 1}
              }
            })
            Transforms.select(this.editor, {path: sel.anchor.path, offset: sel.anchor.offset - 1})
          }
        }
      } else {
        this.editor.insertText('\t')
      }
    } else {
      const [start, end] = Range.edges(sel)
      const [code] = Editor.nodes(this.editor, {
        match: n => n?.type === 'code'
      })
      if (e.shiftKey) {
        const [node] = Editor.nodes<any>(this.editor, {
          match: n => n.type === 'list'
        })
        if (node) {
          const [start, end] = Range.edges(sel)
          const anchor = start.path.join(',').startsWith(node[1].join(',')) ? start : Editor.start(this.editor, node[1])
          const focus = end.path.join(',').startsWith(node[1].join(',')) ? end : Editor.end(this.editor, node[1])
          Transforms.liftNodes(this.editor, {at: {anchor, focus}})
          Transforms.liftNodes(this.editor)
        } else {
          Transforms.liftNodes(this.editor)
        }
        return
      }
      Transforms.select(this.editor, {
        path: end.path,
        offset: end.offset
      })
    }
  }

  private tableCell(node: TableCellNode, nodePath: Path, shift = false) {
    const sel = this.editor.selection!
    const text = Node.string(node)
    if (shift) {
      if (Path.hasPrevious(nodePath)) {
        Transforms.select(this.editor, Editor.end(this.editor, Path.previous(nodePath)))
      } else if (Path.hasPrevious(Path.parent(nodePath))) {
        Transforms.select(this.editor, Editor.end(this.editor, Path.previous(Path.parent(nodePath))))
      }
      return true
    } else {
      if (text.length === sel!.anchor.offset) {
        if (Editor.hasPath(this.editor, Path.next(nodePath))) {
          Transforms.select(this.editor, Editor.end(this.editor, Path.next(nodePath)))
        } else if (Editor.hasPath(this.editor, Path.next(Path.parent(nodePath)))) {
          Transforms.select(
            this.editor,
            Editor.end(this.editor, [...Path.next(Path.parent(nodePath)), 0])
          )
        }
        return true
      }
    }
    return false
  }

  private listItem(node: NodeEntry<ParagraphNode>, e: React.KeyboardEvent) {
    if (e.shiftKey) {
      const li = Editor.node(this.editor, Path.parent(node[1]))
      const ul = Editor.node(this.editor, Path.parent(li[1]))
      const container = Editor.node(this.editor, Path.parent(ul[1]))
      if (!Path.hasPrevious(ul[1]) && Node.parent(this.editor, ul[1]).type === 'list-item') return true
      const top = !Path.hasPrevious(node[1])
      const first = !Path.hasPrevious(li[1])
      if (top) {
        Transforms.liftNodes(this.editor, {at: li[1]})
        if (container[0].type === 'list-item') {
          const movePath = first ? ul[1] : Path.next(ul[1])
          Transforms.moveNodes(this.editor, {at: movePath, to: Path.next(container[1])})
          let start = li[0].children.length
          while (Editor.hasPath(this.editor, movePath)) {
            Transforms.moveNodes(this.editor, {
              at: movePath,
              to: [...Path.next(container[1]), start]
            })
            start++
          }
        } else {
          Transforms.unwrapNodes(this.editor, {at: first ? ul[1] : Path.next(ul[1])})
        }
      } else {
        const move = li[0].children.length - node[1].slice().pop()! - 1
        Transforms.liftNodes(this.editor, {
          at: {anchor: Editor.start(this.editor, node[1]), focus: Editor.end(this.editor, li[1])}
        })
        const nextPath = Path.next(li[1])
        const lastIndex = nextPath.slice().pop()!
        Transforms.liftNodes(this.editor, {
          at: {anchor: {path: nextPath, offset: 1}, focus: {path: nextPath.slice(0, -1).concat([lastIndex + move]), offset: 0}}
        })
      }
      return true
    } else {
      const listItem = Editor.parent(this.editor, node[1])
      const list = Editor.parent(this.editor, listItem[1])
      if (!Node.string(node[0]) && Path.hasPrevious(listItem[1]) && listItem[0].children.length === 1) {
        Transforms.removeNodes(this.editor, {
          at: listItem[1]
        })
        const pre = Path.previous(listItem[1])
        const [next] = Node.children(this.editor, pre, {reverse: true})
        Transforms.insertNodes(this.editor, {
          type: 'list',
          order: list[0].order,
          task: list[0].task,
          children: [{
            type: 'list-item',
            checked: Node.get(this.editor, pre).checked,
            children: [{type: 'paragraph', children: [{text: ''}]}]
          }]
        }, {at: Path.next(next[1]), select: true})
        return true
      }
      return false
    }
  }
}
