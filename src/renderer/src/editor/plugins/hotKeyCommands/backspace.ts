import { Editor, Element, Node, Path, Point, Range, Transforms } from 'slate'
import { EditorUtils } from '../../utils/editorUtils'
import { configStore } from '../../../store/config'
import { Elements } from '../../../el'

export class BackspaceKey {
  constructor(
    private readonly editor: Editor
  ) {}

  range() {
    const sel = this.editor.selection
    if (!sel) return
    let [start, end] = Range.edges(sel)
    if (Point.equals(start, Editor.start(this.editor, [])) && Point.equals(end, Editor.end(this.editor, []))) {
      EditorUtils.deleteAll(this.editor)
      Transforms.select(this.editor, Editor.end(this.editor, []))
      return true
    }
    return false
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
    const nodes = Array.from<any>(Editor.nodes<Elements>(this.editor, {
      mode: 'lowest',
      match: n => Element.isElement(n)
    }))
    const [node] = nodes
    if (node[0].type === 'inline-katex' && !Node.string(node[0])) {
      Transforms.delete(this.editor, {at: Path.parent(sel.anchor.path)})
      return true
    }
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
    if (el.type === 'media' || el.type === 'attach') {
      Transforms.removeNodes(this.editor, { at: path })
      Transforms.insertNodes(this.editor, EditorUtils.p, {
        at: node[1],
        select: true
      })
      return true
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
        const parent = Editor.parent(this.editor, Path.parent(node[1]))
        if (!Path.hasPrevious(path) && !Path.hasPrevious(Path.parent(path)) && parent[0].children?.every((c: any) => !Node.string(c))) {
          Transforms.delete(this.editor, {at: parent[1]})
          Transforms.insertNodes(this.editor, EditorUtils.p, {select: true, at: parent[1]})
        }
        return true
      }
    }
    if (el.type === 'code-line') {
      let str = el.children[0].text as string
      str = str.slice(0, sel.anchor.offset)
      let m = str.match(/\s+$/)
      str = m?.[0] || ''
      if (str) {
        let decrement = str.length % configStore.config.codeTabSize
        if (decrement === 0) decrement = configStore.config.codeTabSize
        let ao = sel.anchor.offset - decrement
        Transforms.delete(this.editor, {
          at: {
            anchor: {
              path: sel.anchor.path,
              offset: ao < 0 ? 0 : ao
            },
            focus: sel.anchor
          }
        })
        return true
      }
    }
    /**
     * 防止删除paragraph与空table-cell混合
     */
    if (sel.anchor.offset === 0) {
      const preInline = Editor.previous<any>(this.editor, {at: sel.focus.path})
      if (preInline && preInline[0].type === 'break') {
        Transforms.delete(this.editor, {at: preInline[1]})
        return true
      }
      if (el.type === 'paragraph') {
        const pre = Editor.previous<any>(this.editor, {at: path})
        if (pre) {
          if (['table', 'code'].includes(pre[0].type)) {
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
          if (pre[0].type === 'media' || pre[0].type === 'attach') {
            if (!Node.string(el)) {
              Transforms.delete(this.editor, {at: path})
            }
            Transforms.select(this.editor, pre[1])
            return true
          }
        }
        if (!pre && !Editor.previous<any>(this.editor, {at: sel.anchor.path})) {
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
              Transforms.insertNodes(this.editor, EditorUtils.copy(parent[0].children), {
                at: listPath
              })
              Transforms.select(this.editor, Editor.start(this.editor, listPath))
            } else {
              let cur = Path.next(path)
              const moveIndex = preListItem[0].children.length
              if (Editor.hasPath(this.editor, cur)) {
                EditorUtils.moveNodes(this.editor, cur, preListItem[1], moveIndex)
              }
              const movePath = [...preListItem[1], moveIndex]
              Transforms.moveNodes(this.editor, {
                at: path,
                to: movePath
              })
              // 删除list-item
              Transforms.delete(this.editor, {at: parent[1]})
            }
            return true
          }

          // 可删除顶级元素中的第一个段落
          const next = Editor.hasPath(this.editor, Path.next(path))
          if (Editor.isEditor(parent[0]) && next && Editor.node(this.editor, Path.next(path))[0].type !== 'hr') {
            Transforms.delete(this.editor, {at: path})
            return true
          }
        }
        return false
      }

      if (el.type === 'code-line') {
        const pre = Path.hasPrevious(path)
        const hasNext = Editor.hasPath(this.editor, Path.next(path))
        if (!pre && !hasNext) {
          const str = Node.string(el)
          const parent = Path.parent(path)
          Transforms.delete(this.editor, {at: parent})
          Transforms.insertNodes(this.editor, {
            type: 'paragraph', children: [{text: str || ''}]
          }, {at: parent})
          Transforms.select(this.editor, Editor.start(this.editor, parent))
          return true
        }
      }
    }
    return false
  }
}
