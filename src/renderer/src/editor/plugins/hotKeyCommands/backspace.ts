import {Editor, Element, Node, Path, Point, Range, Transforms} from 'slate'
import {EditorUtils} from '../../utils/editorUtils'
import {Elements} from '../../../el'

export class BackspaceKey {
  constructor(
    private readonly editor: Editor
  ) {}

  range() {
    const sel = this.editor.selection
    if (!sel) return
    const [start, end] = Range.edges(sel)
    if (Path.isCommon(start.path, end.path)) {
      Transforms.delete(this.editor, {
        at: {anchor: start, focus: end}
      })
      return true
    }
    if (Point.equals(start, Editor.start(this.editor, [])) && Point.equals(end, Editor.end(this.editor, []))) {
      EditorUtils.reset(this.editor)
      Transforms.select(this.editor, Editor.start(this.editor, []))
      return true
    }
    const nodes = Array.from(Editor.nodes<Elements>(this.editor, {
      match: n => Element.isElement(n),
      reverse: true,
      mode: 'highest'
    }))
    for (let n of nodes) {
      if (EditorUtils.includeAll(this.editor, sel, n[1])) {
        Transforms.delete(this.editor, {at: n[1]})
        if (n[0].type === 'code' && nodes.length === 1) {
          Transforms.insertNodes(this.editor, {
            type: 'code',
            language: n[0].language,
            children: [{type: 'code-line', children: [{text: ''}]}],
            katex: n[0].katex
          }, {at: n[1]})
        }
        // 如果是首个元素 替换paragraph
      } else if (n[0].type === 'table') {
        const cells = Array.from(Editor.nodes(this.editor, {
          match: n => n?.type === 'table-cell'
        }))
        for (let c of cells) {
          if (EditorUtils.includeAll(this.editor, sel, c[1])) {
            Transforms.insertFragment(this.editor, [{text: ''}], {
              at: {
                anchor: Editor.start(this.editor, c[1]),
                focus: Editor.end(this.editor, c[1])
              }
            })
          } else {
            const nStart = Editor.start(this.editor, c[1])
            const nEnd = Editor.end(this.editor, c[1])
            if (!Point.isBefore(start, nEnd)) continue
            Transforms.delete(this.editor, {
              at: {
                anchor: Point.isBefore(start, nStart) ? nStart : start,
                focus: Point.isAfter(end, nEnd) ? nEnd : end
              }
            })
          }
        }
      } else {
        const nStart = Editor.start(this.editor, n[1])
        const nEnd = Editor.end(this.editor, n[1])
        if (!Point.isBefore(start, nEnd)) continue
        Transforms.delete(this.editor, {
          at: {
            anchor: Point.isBefore(start, nStart) ? nStart : start,
            focus: Point.isAfter(end, nEnd) ? nEnd : end
          }
        })
      }
    }
    if (Editor.hasPath(this.editor, start.path)) {
      Transforms.select(this.editor, Editor.start(this.editor, start.path))
    } else if (Path.hasPrevious(start.path)) {
      Transforms.select(this.editor, Editor.end(this.editor, Path.previous(start.path)))
    } else {
      const top = Path.ancestors(start.path)[1]
      if (Path.hasPrevious(top)) {
        const end = Editor.end(this.editor, Path.previous(top))
        Transforms.select(this.editor, end)
      } else {
        Transforms.select(this.editor, Editor.start(this.editor, []))
      }
    }
    return true
  }

  private clearStyle(sel: Range) {
    const start = Range.start(sel)
    const leaf = Node.leaf(this.editor, start.path)
    if (leaf.text?.length === 1 && EditorUtils.isDirtLeaf(leaf)) {
      EditorUtils.clearMarks(this.editor)
    }
  }

  run() {
    const sel = this.editor.selection
    if (!sel) return
    const nodes = Array.from(Editor.nodes<Elements>(this.editor, {
      mode: 'lowest',
      match: n => Element.isElement(n)
    }))
    const [node] = nodes
    this.clearStyle(sel)
    const [el, path] = node
    if (el.type === 'head') {
      const str = Node.string(el)
      if (!str) {
        Transforms.setNodes(this.editor, {
          type: 'paragraph'
        }, {at: path})
        return true
      }
    }

    if (el.type === 'table-cell') {
      const start = Range.start(sel)
      if (start.offset === 0 && !Path.hasPrevious(start.path)) {
        const pre = Path.hasPrevious(path)
        if (pre) {
          Transforms.select(this.editor, Editor.end(this.editor, Path.previous(path)))
        } else {
          const rowPath = Path.parent(path)
          const preRow = Path.hasPrevious(rowPath)
          if (preRow) {
            Transforms.select(this.editor, Editor.end(this.editor, Path.previous(rowPath)))
          }
        }
        return true
      }
    }
    /**
     * 防止删除paragraph与空table-cell混合
     */
    if (sel.anchor.offset === 0) {
      const preInline = Editor.previous<any>(this.editor, {at: sel.focus.path})
      if (preInline && preInline[0].type === 'media') {
        Transforms.delete(this.editor, {at: preInline[1]})
        return true
      }
      if (el.type === 'paragraph') {
        const pre = Editor.previous<any>(this.editor, {at: path})
        if (pre && ['table', 'code'].includes(pre[0].type)) {
          const end = Editor.end(this.editor, pre[1])
          if (!Node.string(Node.get(this.editor, end.path))) {
            Transforms.delete(this.editor, {at: path})
            const text = Node.string(el)
            if (text) {
              Transforms.insertNodes(this.editor, pre[0].type === 'code' ? [{text}] : el.children, {
                at: end
              })
            }
            Transforms.select(this.editor, end)
            return true
          }
        }
        if (!pre) {
          const parent = Editor.parent(this.editor, path)
          if (parent[0].type === 'blockquote') {
            if (Editor.hasPath(this.editor, Path.next(path))) {
              Transforms.delete(this.editor, {at: path})
            } else {
              Transforms.delete(this.editor, {at: parent[1]})
            }
            Transforms.insertNodes(this.editor, {type: 'paragraph', children: el.children}, {at: parent[1]})
            Transforms.select(this.editor, Editor.start(this.editor, parent[1]))
            return true
          }
          if (parent[0].type === 'list-item') {
            const preListItem = Editor.previous<any>(this.editor, {at: parent[1]})
            if (!preListItem) {
              const hasNext = Editor.hasPath(this.editor, Path.next(parent[1]))
              const listPath = Path.parent(parent[1])
              if (hasNext) {
                Transforms.delete(this.editor, {at: parent[1]})
              } else {
                Transforms.delete(this.editor, {at: listPath})
              }
              Transforms.insertNodes(this.editor, el, {
                at: listPath,
                select: true
              })
              return true
            }
          }

          // 可删除顶级元素中的第一个段落
          const next = Editor.hasPath(this.editor, Path.next(path))
          if (Editor.isEditor(parent[0]) && next && Editor.node(this.editor, Path.next(path))[0].type !== 'hr') {
            Transforms.delete(this.editor, {at: path})
          }
        }
        return false
      }

      if (el.type === 'code-line') {
        const pre = Path.hasPrevious(path)
        if (!pre) {
          const hasNext = Editor.hasPath(this.editor, Path.next(path))
          if (!hasNext) {
            const str = Node.string(el)
            const parent = Path.parent(path)
            Transforms.delete(this.editor, {at: parent})
            Transforms.insertNodes(this.editor, {
              type: 'paragraph', children: [{text: str || ''}]
            }, {at: parent})
            Transforms.select(this.editor, Editor.start(this.editor, parent))
          }
          return true
        }
      }
    }
    return false
  }
}
