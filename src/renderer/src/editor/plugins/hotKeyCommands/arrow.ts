import {Editor, Element, Node, Path, Range, Transforms} from 'slate'
import {EditorUtils} from '../../utils/editorUtils'
import React from 'react'
import {isMod} from '../../../utils/keyboard'
import isHotkey from 'is-hotkey'

export const keyArrow = (editor: Editor, e: React.KeyboardEvent | KeyboardEvent) => {
  const sel = editor.selection
  if (sel && Range.isCollapsed(sel)) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      if (!isMod(e)) {
        const leaf = Node.leaf(editor, sel.focus.path)
        const dirt = EditorUtils.isDirtLeaf(leaf)
        const pre = Editor.previous<any>(editor, {at: sel.focus.path})
        if (sel.focus.offset === 0 && pre && pre[0].type === 'media') {
          Transforms.select(editor, pre[1])
        } else if (sel.focus.offset === 0 && dirt) {
          EditorUtils.moveBeforeSpace(editor, sel.focus.path)
        } else {
          Transforms.move(editor, { unit: 'offset', reverse: true })
        }
      } else {
        Transforms.select(editor, Editor.start(editor, Path.parent(sel.focus.path)))
      }
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      if (!isMod(e)) {
        const leaf = Node.leaf(editor, sel.focus.path)
        const dirt = EditorUtils.isDirtLeaf(leaf)
        const next = Editor.next<any>(editor, {at: sel.focus.path})
        if (sel.focus.offset === leaf.text?.length && next && next[0].type === 'media') {
          Transforms.select(editor, next[1])
        } else if (sel.focus.offset === leaf.text?.length && dirt && !Editor.next(editor, {at: sel.focus.path})) {
          EditorUtils.moveAfterSpace(editor, sel.focus.path)
        } else {
          Transforms.move(editor, { unit: 'offset' })
        }
      } else {
        Transforms.select(editor, Editor.end(editor, Path.parent(sel.focus.path)))
      }
      return
    }
    if (e.key === 'ArrowUp') {
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
    }
    if (e.key === 'ArrowDown') {
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
      if (el.type === 'paragraph') {
        if (path[0] === 0 && !Node.string(el) && Editor.isEditor(Node.get(editor, Path.parent(path)))) {
          const next = Editor.node(editor, Path.next(path))
          if (['table', 'code', 'blockquote'].includes(next[0].type)) {
            e.preventDefault()
            Transforms.select(editor, Editor.start(editor, Path.next(path)))
            Transforms.delete(editor, {at: path})
          }
        }
        if (Node.string(el) && EditorUtils.checkSelEnd(editor, path)) {
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: [editor.children.length],
            select: true
          })
        }
      }
    }
  }
}
