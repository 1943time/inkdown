import {Editor, Element, Node, Path, Range, Text, Transforms} from 'slate'
import {EditorUtils} from '../../utils/editorUtils'
import React from 'react'
import {isMod} from '../../../utils/keyboard'
import isHotkey from 'is-hotkey'

export const keyArrow = (editor: Editor, e: React.KeyboardEvent | KeyboardEvent) => {
  const sel = editor.selection
  if (sel && Range.isCollapsed(sel)) {
    if (isHotkey('mod+left', e)) {
      const [node] = Editor.nodes(editor, {
        match: n => n.type === 'code-line'
      })
      if (node) {
        const str = Node.string(node[0]) || ''
        const pre = str.slice(0, sel.anchor.offset)
        if (/[^\s\t]+/.test(pre)) {
          Transforms.select(editor, {
            path: [...node[1], 0],
            offset: str.match(/^[\s\t]*/)?.[0].length || 0
          })
        } else {
          Transforms.select(editor, Editor.start(editor, Path.parent(sel.focus.path)))
        }
        e.preventDefault()
      }
    }
    if (isHotkey('left', e)) {
      e.preventDefault()
      e.stopPropagation()
      const leaf = Node.leaf(editor, sel.focus.path)
      const dirt = EditorUtils.isDirtLeaf(leaf)
      const pre = Editor.previous<any>(editor, {at: sel.focus.path})
      const [node] = Editor.nodes<any>(editor, {
        match: n => n.type === 'media' || n.type === 'inline-katex'
      })
      if (node) {
        EditorUtils.moveBeforeSpace(editor, node[1])
      } else if (sel.focus.offset === 0 && pre && pre[0].type === 'media') {
        Transforms.select(editor, pre[1])
      } else if (sel.focus.offset === 0 && dirt) {
        EditorUtils.moveBeforeSpace(editor, sel.focus.path)
      } else {
        Transforms.move(editor, {unit: 'offset', reverse: true})
      }
      return
    }
    if (isHotkey('right', e)) {
      e.preventDefault()
      e.stopPropagation()
      if (!isMod(e)) {
        const leaf = Node.leaf(editor, sel.focus.path)
        const dirt = EditorUtils.isDirtLeaf(leaf)
        const next = Editor.next<any>(editor, {at: sel.focus.path})
        const [node] = Editor.nodes<any>(editor, {
          match: n => n.type === 'media' || n.type === 'inline-katex'
        })
        if (node) {
          EditorUtils.moveAfterSpace(editor, node[1])
        } else if (sel.focus.offset === leaf.text?.length && next && next[0].type === 'media') {
          Transforms.select(editor, next[1])
        } else if (sel.focus.offset === leaf.text?.length && dirt && !Editor.next(editor, {at: sel.focus.path})) {
          EditorUtils.moveAfterSpace(editor, sel.focus.path)
        } else {
          Transforms.move(editor, {unit: 'offset'})
        }
      } else {
        Transforms.select(editor, Editor.end(editor, Path.parent(sel.focus.path)))
      }
      return
    }
    if (isHotkey('up', e)) {
      const [node] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      const [el, path] = node
      if (el.type === 'code-line') {
        const code = Path.parent(path)
        if (!Path.hasPrevious(path) && !Path.hasPrevious(code)) {
          e.preventDefault()
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: Path.parent(path),
            select: true
          })
        }
      }
      if (el.type === 'table-cell') {
        const row = Path.parent(path)
        const table = Path.parent(row)
        if (!Path.hasPrevious(row) && !Path.hasPrevious(Path.parent(row))) {
          e.preventDefault()
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: table,
            select: true
          })
        }
        if (Path.hasPrevious(row)) {
          Transforms.select(editor, Editor.end(editor, [...Path.previous(row), path[path.length - 1]]))
          e.preventDefault()
        }
      }
      if (el.type === 'media') {
        e.preventDefault()
        const pre = EditorUtils.findPrev(editor, Path.parent(path))
        Transforms.select(editor, Editor.start(editor, pre))
      }
    }
    if (isHotkey('down', e)) {
      const [node] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      const [el, path] = node
      if (el.type === 'table-cell') {
        const row = Path.parent(path)
        const table = Path.parent(row)
        if (!Editor.hasPath(editor, Path.next(row))) {
          if (!Editor.hasPath(editor, Path.next(table))) {
            Transforms.insertNodes(editor, EditorUtils.p, {
              at: Path.next(table), select: true
            })
          }
        } else {
          e.preventDefault()
          Transforms.select(editor, Editor.end(editor, [...Path.next(row), path[path.length - 1]]))
        }
      }

      if (el.type === 'code-line' && !Editor.hasPath(editor, Path.next(path))) {
        const code = Path.parent(path)
        if (!Editor.hasPath(editor, Path.next(code))) {
          e.preventDefault()
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: Path.next(code), select: true
          })
        }
      }
      if (el.type === 'media') {
        const next = EditorUtils.findNext(editor, path)
        e.preventDefault()
        Transforms.select(editor, Editor.end(editor, next))
      }
      if (el.type === 'paragraph') {
        if (path[0] === 0 && !Node.string(el) && Editor.isEditor(Node.get(editor, Path.parent(path))) && Editor.hasPath(editor, Path.next(path))) {
          const next = Editor.node(editor, Path.next(path))
          if (['table', 'code', 'blockquote'].includes(next[0].type)) {
            e.preventDefault()
            Transforms.select(editor, Editor.start(editor, Path.next(path)))
            Transforms.delete(editor, {at: path})
          }
        }
        if ((Node.string(el) || el.children.length > 1 || el.children[0].type === 'media') && EditorUtils.checkSelEnd(editor, path)) {
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: [editor.children.length],
            select: true
          })
        }
      }
    }
  }
}
