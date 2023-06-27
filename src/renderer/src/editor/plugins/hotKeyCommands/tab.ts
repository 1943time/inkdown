import React from 'react'
import {BasePoint, Editor, Element, Node, NodeEntry, Path, Point, Range, Transforms} from 'slate'
import {CodeLineNode, NodeTypes, ParagraphNode, TableCellNode, TableRowNode} from '../../../el'
import {configStore} from '../../../store/config'

export class TabKey {
  constructor(
    private readonly editor: Editor
  ) {}
  run(e: React.KeyboardEvent) {
    const sel = this.editor.selection
    if (!sel) return
    e.preventDefault()
    if (Range.isCollapsed(sel)) {
      const [node] = Editor.nodes<any>(this.editor, {
        match: n => Element.isElement(n) &&['table-cell', 'paragraph', 'code-line'].includes(n.type),
        mode: 'lowest'
      })
      if (sel) {
        if (node) {
          const [el, path] = node
          switch (node[0].type as NodeTypes) {
            case 'table-cell':
              if (this.tableCell(el, path)) return
              break
            case 'paragraph':
              const parent = Node.parent(this.editor, node[1])
              if (parent.type === 'list-item') if (this.listItem(node)) return
              break
            case 'code-line':
              if (this.codeLine(e, node, sel)) return
              break
          }
        }
      }
      this.editor.insertText('\t')
    } else {
      const [start, end] = Range.edges(sel)
      const [code] = Editor.nodes(this.editor, {
        match: n => n?.type === 'code'
      })
      if (code) {
        if (
          Point.compare(Editor.start(this.editor, code[1]), start) !== 1 &&
          Point.compare(Editor.end(this.editor, code[1]), end) !== -1
        ) {
          const nodes = Editor.nodes(this.editor, {
            match: n => n?.type === 'code-line'
          })
          for (let [el, path] of nodes) {
            const start = Editor.start(this.editor, path)
            if (e.shiftKey) {
              const str = Node.string(el)
              const m = str.match(/^(\t|\s{1,2})/)
              if (m) {
                const length = m[0].length
                Transforms.delete(this.editor, {
                  at: {
                    anchor: {
                      path: start.path,
                      offset: 0
                    },
                    focus: {
                      path: start.path,
                      offset: length
                    }
                  }
                })
              }
            } else {
              Transforms.insertText(this.editor, '\t', {
                at: start
              })
            }
          }
          return
        }
      }
      Transforms.select(this.editor, {
        path: end.path,
        offset: end.offset
      })
    }
  }
  private codeLine(e: React.KeyboardEvent, node: NodeEntry<CodeLineNode>, sel: Range) {
    if (e.shiftKey) {
      const str = Node.string(node[0])
      const m = str.match(/^\t|\s{1,2}/)
      if (m) {
        const length = m[0].length
        Transforms.delete(this.editor, {
          at: {
            anchor: {
              path: sel.anchor.path,
              offset: 0
            },
            focus: {
              path: sel.anchor.path,
              offset: length
            }
          }
        })
        const point:BasePoint = {
          path: sel.anchor.path,
          offset: sel.anchor.offset - length
        }
        Transforms.select(this.editor, {
          anchor: point,
          focus: point
        })
      }
      return true
    }
    return false
  }
  private tableCell(node: TableCellNode, nodePath: Path) {
    const sel = this.editor.selection!
    const text = Node.string(node)
    if (text.length === sel!.anchor.offset) {
      const parentPath = Path.parent(nodePath)
      const p = Node.get(this.editor, parentPath) as TableRowNode
      const length = p.children.length
      const index = nodePath[2] + 1
      const path = nodePath.slice()
      if (index + 1 > length) {
        const next = Editor.next(this.editor, {at: parentPath})
        if (next) {
          const path = Editor.start(this.editor, next[1]).path
          const offset = Editor.end(this.editor, path)
          Transforms.select(this.editor, offset)
        }
      } else {
        path[2] = path[2] + 1
        Transforms.select(this.editor, Editor.end(this.editor, path))
      }
      return true
    }
    return false
  }

  private listItem(node: NodeEntry<ParagraphNode>) {
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
