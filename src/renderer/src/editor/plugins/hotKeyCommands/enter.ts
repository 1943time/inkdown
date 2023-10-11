import React from 'react'
import {BaseSelection, Editor, Element, Node, NodeEntry, Path, Point, Range, Transforms} from 'slate'
import {CodeLineNode, HeadNode, NodeTypes, ParagraphNode, TableNode} from '../../../el'
import {EditorUtils} from '../../utils/editorUtils'
import {BlockMathNodes} from '../elements'
import {BackspaceKey} from './backspace'
import {isMod} from '../../../utils/keyboard'
import isHotkey from 'is-hotkey'

export class EnterKey {
  constructor(
    private readonly editor: Editor,
    private readonly backspace: BackspaceKey
  ) {
  }

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
              const parent = Editor.parent(this.editor, node[1])
              if (parent[0].type !== 'list-item' || Path.hasPrevious(path)) {
                Transforms.transform(this.editor, {
                  type: 'insert_node',
                  path: Path.next(end.path),
                  node: {text: ''}
                })
                Transforms.move(this.editor, {unit: 'offset'})
              }
            }
          }
          const str = Node.string(el)
          if (!str && !el.children.some((c: any) => c.type === 'media')) {
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
      const [ul, ulPath] = Editor.parent(this.editor, parentPath)
      const realEmpty = parent.children.length === 1
      if (ul.children.length === 1 && realEmpty) {
        e.preventDefault()
        Transforms.delete(this.editor, {at: ulPath})
        Transforms.insertNodes(this.editor, EditorUtils.p, {at: ulPath, select: true})
        return
      }
      if (realEmpty) {
        e.preventDefault()
        if (!Path.hasPrevious(parentPath)) {
          Transforms.delete(this.editor, {at: parentPath})
          Transforms.insertNodes(this.editor, EditorUtils.p, {at: ulPath, select: true})
        } else if (!Editor.hasPath(this.editor, Path.next(parentPath))) {
          Transforms.delete(this.editor, {at: parentPath})
          Transforms.insertNodes(this.editor, EditorUtils.p, {at: Path.next(ulPath), select: true})
        } else {
          Transforms.liftNodes(this.editor, {
            at: parentPath
          })
          Transforms.delete(this.editor, {at: Path.next(ulPath)})
          Transforms.insertNodes(this.editor, EditorUtils.p, {
            at: Path.next(ulPath),
            select: true
          })
        }
      } else {
        if (!Editor.hasPath(this.editor, Path.next(path))) {
          e.preventDefault()
          Transforms.delete(this.editor, {at: path})
          Transforms.insertNodes(this.editor, {
            type: 'list-item',
            checked: typeof parent.checked === 'boolean' ? false : undefined,
            children: [EditorUtils.p]
          }, {at: Path.next(parentPath), select: true})
        } else if (!Path.hasPrevious(path)) {
          e.preventDefault()
          Transforms.insertNodes(this.editor, {
            type: 'list-item',
            checked: typeof parent.checked === 'boolean' ? false : undefined,
            children: [EditorUtils.p]
          }, {at: Path.next(parentPath), select: true})
          let cur = Path.next(path)
          let index = 1
          EditorUtils.moveNodes(this.editor, cur, Path.next(parentPath), index)
        }
      }
    }
  }

  private table(node: NodeEntry<TableNode>, sel: BaseSelection, e: React.KeyboardEvent) {
    if (isMod(e)) {
      if (e.shiftKey) {
        Transforms.insertNodes(this.editor, [{type: 'break', children: [{text: ''}]}, {text: ''}], {select: true})
        e.preventDefault()
      } else {
        const row = Editor.parent(this.editor, node[1])
        const insertRow = {
          type: 'table-row', children: row[0].children.map(c => {
            return {type: 'table-cell', children: [{text: ''}]}
          })
        }
        Transforms.insertNodes(this.editor, insertRow, {
          at: Path.next(row[1])
        })
        Transforms.select(this.editor, Editor.start(this.editor, Path.next(row[1])))
      }
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
      if (isMod(e) || Path.hasPrevious(node[1])) {
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
        e.preventDefault()
        let checked:boolean | undefined =  undefined
        if (typeof parent[0].checked === 'boolean') {
          if (sel.anchor.offset === 0 && !Path.hasPrevious(sel.anchor.path) && !Path.hasPrevious(node[1])) {
            checked = parent[0].checked
            Transforms.insertNodes(this.editor, {
              type: 'list-item',
              children: [EditorUtils.p],
              checked: typeof checked === 'boolean' ? false : undefined
            }, {at: parent[1]})
            Transforms.select(this.editor, Editor.start(this.editor, Path.next(parent[1])))
            return
          } else {
            checked = false
          }
        }
        const text = Point.equals(Editor.end(this.editor, node[1]), sel.focus) ? [{text: ''}] : EditorUtils.cutText(this.editor, sel.focus)
        Transforms.insertNodes(this.editor, {
          type: 'list-item',
          children: [{type: 'paragraph', children: text}],
          checked
        }, {at: Path.next(parent[1])})
        if (!Point.equals(sel.anchor, Editor.end(this.editor, node[1]))) {
          Transforms.delete(this.editor, {
            at: {
              anchor: sel.anchor,
              focus: Editor.end(this.editor, node[1])
            }
          })
        }
        Transforms.select(this.editor, Editor.start(this.editor, Path.next(parent[1])))
        if (Editor.hasPath(this.editor, Path.next(node[1]))) {
          EditorUtils.moveNodes(this.editor, Path.next(node[1]), Path.next(parent[1]), 1)
        }
      }
    }
  }

  private codeLine(node: CodeLineNode, path: Path, sel: BaseSelection, e: React.KeyboardEvent) {
    if (isMod(e)) {
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

