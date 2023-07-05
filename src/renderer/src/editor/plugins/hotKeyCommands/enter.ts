import React from 'react'
import {BaseSelection, Editor, Element, Node, NodeEntry, Path, Point, Range, Transforms} from 'slate'
import {CodeLineNode, HeadNode, NodeTypes, ParagraphNode, TableNode} from '../../../el'
import {EditorUtils} from '../../utils/editorUtils'
import {BlockMathNodes} from '../elements'
import {BackspaceKey} from './backspace'

export class EnterKey {
  constructor(
    private readonly editor: Editor,
    private readonly backspace: BackspaceKey
  ) {}

  run(e: React.KeyboardEvent) {
    let sel = this.editor.selection
    if (!sel) return
    if (!Range.isCollapsed(sel)) {
      e.preventDefault()
      this.backspace.range()
      return
    }

    const [node] = Editor.nodes<Element>(this.editor, {
      match: n => Element.isElement(n),
      mode: 'lowest'
    })
    if (node) {
      let [el, path] = node
      switch (el.type as NodeTypes) {
        case 'table-cell':
          e.preventDefault()
          this.table(node, sel, e)
          break
        case 'code-line':
          if (this.codeLine(el, path, sel, e)) {
            e.preventDefault()
          }
          break
        case 'paragraph':
          const end = Range.end(sel)
          const leaf = Node.leaf(this.editor, end.path)
          const dirt = EditorUtils.isDirtLeaf(leaf)
          if (dirt && end.offset === leaf.text?.length) {
            if (Editor.hasPath(this.editor, Path.next(end.path))) {
              Transforms.move(this.editor, {unit: 'offset'})
            } else {
              Transforms.transform(this.editor, {
                type: 'insert_node',
                path: Path.next(end.path),
                node: {text: ''}
              })
              Transforms.move(this.editor, {unit: 'offset'})
            }
          }
          const str = Node.string(el)
          if (!str) {
            this.empty(e, path)
          } else {
            this.paragraph(e, node, sel)
          }
          break
        case 'head':
          if (this.head(el, path, sel)) {
            e.preventDefault()
          }
          break
      }
    }
  }

  empty(e: React.KeyboardEvent, path: Path) {
    const [parent, parentPath] = Editor.parent(this.editor, path)
    if (parent.type === 'blockquote') {
      if (!Path.hasPrevious(path)) {
        const hashNext = Editor.hasPath(this.editor, Path.next(path))
        if (!hashNext) {
          Transforms.delete(this.editor, {
            at: parentPath
          })
          Transforms.insertNodes(this.editor, {
            type: 'paragraph',
            children: [{text: ''}]
          }, {at: parentPath, select: true})
          e.preventDefault()
        }
      }
      if (!Editor.hasPath(this.editor, Path.next(path))) {
        Transforms.delete(this.editor, {
          at: path
        })
        Transforms.insertNodes(this.editor, {
          type: 'paragraph',
          children: [{text: ''}]
        }, {at: Path.next(parentPath), select: true})
        e.preventDefault()
      }
    }

    if (parent.type === 'list-item') {
      e.preventDefault()
      const nextPath = Path.next(parentPath)
      if (Editor.hasPath(this.editor, nextPath)) {
        const index = parentPath[parentPath.length - 1]
        if (index === 0) {
          Transforms.delete(this.editor, {at: parentPath})
          Transforms.insertNodes(this.editor, EditorUtils.p, {
            at: Path.parent(parentPath),
            select: true
          })
        } else {
          const ulPath = Path.parent(parentPath)
          Transforms.liftNodes(this.editor, {
            at: parentPath
          })
          Transforms.delete(this.editor, {
            at: Path.next(ulPath)
          })
          Transforms.insertNodes(this.editor, EditorUtils.p, {
            at: Path.next(ulPath),
            select: true
          })
        }
      } else {
        const ul = Editor.parent(this.editor, parentPath)
        const top = Editor.parent(this.editor, ul[1])
        if (top[0].type === 'list-item') {
          Transforms.insertNodes(this.editor, {
            type: 'list-item',
            checked: typeof top[0].checked === 'boolean' ? false : undefined,
            children: [EditorUtils.p]
          }, {select: true, at: Path.next(top[1])})
        } else {
          Transforms.insertNodes(this.editor, EditorUtils.p, {
            at: Path.next(ul[1]), select: true
          })
        }
        if (Path.hasPrevious(parentPath)) {
          Transforms.delete(this.editor, {at: parentPath})
        } else {
          Transforms.delete(this.editor, {at: ul[1]})
        }
      }
    }
  }

  private table(node: NodeEntry<TableNode>, sel: BaseSelection, e: React.KeyboardEvent) {
    if (e.metaKey) {
      const row = Editor.parent(this.editor, node[1])
      const insertRow = {type: 'table-row', children: row[0].children.map(c => {
        return {type: 'table-cell', children: [{text: ''}]}
      })}
      Transforms.insertNodes(this.editor, insertRow, {
        at: Path.next(row[1])
      })
      Transforms.select(this.editor, Editor.start(this.editor, Path.next(row[1])))
    } else {
      const index = node[1][node[1].length - 1]
      const nextRow = Path.next(Path.parent(node[1]))
      if (Editor.hasPath(this.editor, nextRow)) {
        Transforms.select(this.editor, Editor.end(this.editor, [...nextRow, index]))
      } else {
        const tableNext = Path.next(Path.parent(Path.parent(node[1])))
        if (Editor.hasPath(this.editor, tableNext)) {
          Transforms.select(this.editor, Editor.start(this.editor, tableNext))
        } else {
          Transforms.insertNodes(this.editor, EditorUtils.p, {at: tableNext, select: true})
        }
      }
    }
  }

  private head(el: HeadNode, path: Path, sel: Range) {
    const start = Range.start(sel)
    const elStart = Editor.start(this.editor, path)
    if (Point.equals(start, elStart)) {
      Transforms.insertNodes(this.editor, {
        type: 'paragraph', children: [{text: ''}]
      }, {at: path})
    } else {
      const end = Range.end(sel)
      const elEnd = Editor.end(this.editor, path)
      if (Point.equals(end, elEnd)) {
        Transforms.insertNodes(this.editor, {
          type: 'paragraph', children: [{text: ''}]
        }, {at: Path.next(path), select: true})
      } else {
        const fragment = Node.fragment(this.editor, {
          anchor: end,
          focus: elEnd
        })
        Transforms.delete(this.editor, {
          at: {
            anchor: start,
            focus: elEnd
          }
        })
        Transforms.insertNodes(this.editor, {
          type: 'paragraph', children: fragment[0]?.children || [{text: ''}]
        }, {at: Path.next(path)})
        Transforms.select(this.editor, Editor.start(this.editor, Path.next(path)))
      }
    }
    return true
  }

  private paragraph(e: React.KeyboardEvent, node: NodeEntry<ParagraphNode>, sel: Range) {
    const parent = Editor.parent(this.editor, node[1])
    const end = Editor.end(this.editor, node[1])
    if (Point.equals(end, sel.focus)) {
      if (parent[0].type !== 'list-item' || Path.hasPrevious(node[1])) {
        const str = Node.string(node[0])
        for (let n of BlockMathNodes) {
          const m = str.match(n.reg)
          if (m) {
            n.run({
              editor: this.editor,
              path: node[1],
              match: m,
              el: node[0],
              sel,
              startText: m[0],
            })
            e.preventDefault()
            return
          }
        }
      }
    }
    if (parent[0].type === 'list-item') {
      if (e.metaKey || Path.hasPrevious(node[1])) {
        const text = Point.equals(end, sel.focus) ? [{text: ''}] : EditorUtils.cutText(this.editor, sel.focus)
        Transforms.insertNodes(this.editor, {
          type: 'paragraph', children: text
        }, {at: Path.next(node[1])})
        if (!Point.equals(end, sel.focus)) {
          Transforms.delete(this.editor, {
            at: {
              anchor: sel.focus,
              focus: end
            }
          })
        }
        Transforms.select(this.editor, Editor.start(this.editor, Path.next(node[1])))
        e.preventDefault()
      } else {
        const checked = typeof parent[0].checked === 'boolean' ? false : undefined
        if (Point.equals(end, sel.focus)) {
          Transforms.insertNodes(this.editor, {
            type: 'list-item', children: [EditorUtils.p], checked
          }, {at: Path.next(parent[1]), select: true})
          e.preventDefault()
        } else {
          if (!Editor.hasPath(this.editor, Path.next(node[1]))) {
            const next = Path.next(parent[1])
            Transforms.insertNodes(this.editor, {
              type: 'list-item', children: [{type: 'paragraph', children: EditorUtils.cutText(this.editor, sel.focus)}], checked
            }, {at: next})
            Transforms.delete(this.editor, {
              at: {
                anchor: sel.anchor,
                focus: end
              }
            })
            Transforms.select(this.editor, Editor.start(this.editor, next))
            e.preventDefault()
          }
        }
      }
    }
  }

  private codeLine(node: CodeLineNode, path: Path, sel: BaseSelection, e: React.KeyboardEvent) {
    if (e.metaKey) {
      const parent = Path.parent(path)
      Transforms.insertNodes(this.editor, {type: 'paragraph', children: [{text: ''}]}, {
        at: Path.next(parent),
        select: true
      })
      return true
    }
    const end = Range.end(sel!)
    const str = Node.string(node)
    const space = str.match(/^[\s\t]+/g)?.[0] || ''
    const remainText = str.slice(end.offset)
    const next = Path.next(path)
    if (remainText) {
      Transforms.delete(this.editor, {
        at: {
          anchor: end,
          focus: {path: end.path, offset: str.length}
        }
      })
    }
    if (['[', '{'].includes(str[end.offset - 1]) && remainText) {
      const line = {type: 'code-line', children: [{text: space + '\t'}]}
      Transforms.insertNodes(this.editor, [
        line,
        {type: 'code-line', children: [{text: space + remainText}]},
      ], {at: next})

      Transforms.select(this.editor, {
        path: [...next, 0],
        offset: space.length + 1
      })
    } else if (remainText) {
      Transforms.insertNodes(this.editor, {
        type: 'code-line', children: [{text: space + remainText}]
      }, {at: next})
      Transforms.select(this.editor, {
        path: [...next, 0],
        offset: space.length
      })
    } else {
      this.editor.insertNode({
        type: 'code-line', children: [{text: space}]
      })
    }
    return true
  }
}

