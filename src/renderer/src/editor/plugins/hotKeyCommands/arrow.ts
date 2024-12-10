import {Editor, Element, Node, Path, Range, Text, Transforms} from 'slate'
import {EditorUtils} from '../../utils/editorUtils'
import React from 'react'
import isHotkey from 'is-hotkey'
import {EditorStore} from '../../store'
import {isMod} from '../../../utils'

export const keyArrow = (store: EditorStore, e: React.KeyboardEvent | KeyboardEvent) => {
  const editor = store.editor
  const sel = editor.selection
  if (sel && Range.isCollapsed(sel)) {
    if (isHotkey('left', e)) {
      e.preventDefault()
      e.stopPropagation()
      if (sel.anchor.offset === 0 && !Path.hasPrevious(sel.anchor.path)) {
        e.preventDefault()
        EditorUtils.selectPrev(store, sel.anchor.path.slice(0, -1))
        return
      }
      const leaf = Node.leaf(editor, sel.focus.path)
      const dirt = EditorUtils.isDirtLeaf(leaf)
      const pre = Editor.previous<any>(editor, { at: sel.focus.path })
      const [node] = Editor.nodes<any>(editor, {
        match: (n) => n.type === 'inline-katex'
      })
      if (node) {
        EditorUtils.moveBeforeSpace(editor, node[1])
      } else if (
        sel.focus.offset === 0 &&
        pre &&
        (pre[0].type === 'media' || pre[0].type === 'attach')
      ) {
        Transforms.select(editor, pre[1])
      } else if (sel.focus.offset === 0 && dirt) {
        EditorUtils.moveBeforeSpace(editor, sel.focus.path)
      } else {
        if (
          sel.focus.offset === 0 &&
          Path.hasPrevious(sel.focus.path) &&
          Editor.isVoid(editor, Node.get(editor, Path.previous(sel.focus.path)))
        ) {
          if (Path.hasPrevious(Path.previous(sel.focus.path))) {
            Transforms.select(
              editor,
              Editor.end(editor, Path.previous(Path.previous(sel.focus.path)))
            )
          }
        } else {
          if (sel.focus.offset === 0) {
            EditorUtils.selectPrev(store, sel.focus.path)
          } else {
            Transforms.move(editor, { unit: 'offset', reverse: true })
          }
        }
      }
      return
    }
    if (isHotkey('right', e)) {
      e.preventDefault()
      if (!isMod(e)) {
        const leaf = Node.leaf(editor, sel.focus.path)
        const dirt = EditorUtils.isDirtLeaf(leaf)
        const next = Editor.next<any>(editor, { at: sel.focus.path })
        const [node] = Editor.nodes<any>(editor, {
          match: (n) => n.type === 'inline-katex'
        })
        if (node) {
          EditorUtils.moveAfterSpace(editor, node[1])
        } else if (
          sel.focus.offset === leaf.text?.length &&
          next &&
          (next[0].type === 'media' || next[0].type === 'attach')
        ) {
          Transforms.select(editor, next[1])
        } else if (
          sel.focus.offset === leaf.text?.length &&
          dirt &&
          !Editor.next(editor, { at: sel.focus.path })
        ) {
          EditorUtils.moveAfterSpace(editor, sel.focus.path)
        } else {
          const leaf = Node.leaf(editor, sel.focus.path)
          if (
            sel.focus.offset === leaf.text?.length &&
            Editor.hasPath(editor, Path.next(sel.focus.path)) &&
            Editor.isVoid(editor, Node.get(editor, Path.next(sel.focus.path)))
          ) {
            if (Editor.hasPath(editor, Path.next(Path.next(sel.focus.path)))) {
              Transforms.select(
                editor,
                Editor.start(editor, Path.next(Path.next(sel.focus.path)))
              )
            }
          } else {
            if (sel.focus.offset === leaf.text?.length) {
              EditorUtils.selectNext(store, sel.focus.path)
            } else {
              Transforms.move(editor, { unit: 'offset' })
            }
          }
        }
      } else {
        Transforms.select(
          editor,
          Editor.end(editor, Path.parent(sel.focus.path))
        )
      }
      return
    }
    if (isHotkey('up', e)) {
      e.preventDefault()
      const [node] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      const [el, path] = node
      if (el.type === 'table-cell') {
        const row = Path.parent(path)
        if (Path.hasPrevious(row)) {
          Transforms.select(editor, Editor.end(editor, [...Path.previous(row), path[path.length - 1]]))
          e.preventDefault()
          return
        }
      }
      EditorUtils.selectPrev(store, path)
    }
    if (isHotkey('down', e)) {
      e.preventDefault()
      const [node] = Editor.nodes<any>(editor, {
        match: n => Element.isElement(n),
        mode: 'lowest'
      })
      const [el, path] = node
      if (el.type === 'table-cell') {
        const row = Path.parent(path)
        if (Editor.hasPath(editor, Path.next(row))) {
          Transforms.select(editor, Editor.end(editor, [...Path.next(row), path[path.length - 1], 0]))
          return
        }
      }
      const next = EditorUtils.selectNext(store, path)
      if (!next && (el.type !== 'paragraph' || !!Node.string(el))) {
        Transforms.insertNodes(editor, EditorUtils.p, {
          at: Path.next([path[0]]), select: true
        })
      }
      // const [node] = Editor.nodes<any>(editor, {
      //   match: n => Element.isElement(n),
      //   mode: 'lowest'
      // })
      // const [el, path] = node
      // const nextPath = EditorUtils.findNext(editor, path)
      // if (!nextPath) {
      //   if (!Node.string(el)) {
      //     Transforms.insertNodes(editor, EditorUtils.p, {at: Path.next(path)})
      //   }
      //   return
      // }
      // const next = Editor.node(editor, nextPath)
      // if (next?.[0].type === 'code') {
      //   const editor = store.codes.get(next[0])
      //   if (editor) {
      //     e.preventDefault()
      //     EditorUtils.focusAceStart(editor)
      //   }
      //   return
      // }
      // if (next?.[0].type === 'media' || next?.[0].type === 'attach') {
      //   e.preventDefault()
      //   e.stopPropagation()
      //   Transforms.select(editor, next[1])
      //   return
      // }
      // if (el.type === 'table-cell' && !Editor.hasPath(editor, Path.next(sel.focus.path))) {
      //   const row = Path.parent(path)
      //   const table = Path.parent(row)
      //   if (!Editor.hasPath(editor, Path.next(row))) {
      //     if (!Editor.hasPath(editor, Path.next(table))) {
      //       Transforms.insertNodes(editor, EditorUtils.p, {
      //         at: Path.next(table), select: true
      //       })
      //     }
      //   } else {
      //     e.preventDefault()
      //     Transforms.select(editor, Editor.end(editor, [...Path.next(row), path[path.length - 1], 0]))
      //   }
      //   return
      // }
      // if (el.type === 'media' || el.type === 'attach') {
      //   const next = EditorUtils.findNext(editor, path)
      //   if (next) {
      //     e.preventDefault()
      //     Transforms.select(editor, Editor.start(editor, next))
      //   }
      //   return
      // }
    }
  }
}
