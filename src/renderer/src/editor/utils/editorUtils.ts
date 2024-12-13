import {BaseSelection, Editor, Element, Node, Path, Point, Range, Text, Transforms} from 'slate'
import {CustomLeaf} from '../../types/el'
import {History} from 'slate-history'
import {ReactEditor} from 'slate-react'
import {getOffsetTop} from './dom'
import {EditorStore} from '../store'
import { Ace } from 'ace-builds'

export class EditorUtils {
  static get p() {
    return {type: 'paragraph', children: [{text: ''}]}
  }
  static focus(editor: Editor) {
    try {
      ReactEditor.focus(editor)
    } catch (e) {
      console.error(e)
    }
  }
  static blur(editor: Editor) {
    try {
      ReactEditor.blur(editor)
    } catch (e) {
      console.error(e)
    }
  }
  static selectMedia(store: EditorStore, path: Path) {
    Transforms.select(store.editor, path)
    try {
      const top = store.container!.scrollTop
      const dom = ReactEditor.toDOMNode(store.editor, Node.get(store.editor, path))
      const offsetTop = getOffsetTop(dom, store.container!)
      if (top > offsetTop) {
        store.container!.scroll({
          top: offsetTop - 10
        })
      }
    } catch (e) {}
  }
  static isPrevious(firstPath: Path, nextPath: Path) {
    return (Path.equals(Path.parent(firstPath), Path.parent(nextPath)) && Path.compare(firstPath, nextPath) === -1)
  }
  static isNextPath(firstPath: Path, nextPath: Path) {
    return (Path.equals(Path.parent(firstPath), Path.parent(nextPath)) && Path.compare(firstPath, nextPath) === 1)
  }

  static isDirtLeaf(leaf: CustomLeaf) {
    return leaf.bold || leaf.code || leaf.italic || leaf.strikethrough || !!leaf.url || leaf.fnd || leaf.fnc || leaf.html || leaf.highColor
  }

  static isTop(editor: Editor, path: Path) {
    const p = Editor.parent(editor, path)
    return Editor.isEditor(p[0])
  }
  static selectPrev(store: EditorStore, path: Path) {
    const prePath = EditorUtils.findPrev(store.editor, path)
    if (prePath) {
      const node = Node.get(store.editor, prePath)
      if (node.type === 'code') {
        const ace = store.codes.get(node)
        if (ace) {
          EditorUtils.focusAceEnd(ace)
        }
        return true
      } else {
        Transforms.select(store.editor, Editor.end(store.editor, prePath))
      }
      EditorUtils.focus(store.editor)
      return true
    } else {
      return false
    }
  }
  static selectNext(store: EditorStore, path: Path) {
    const nextPath = EditorUtils.findNext(store.editor, path)
    if (nextPath) {
      const node = Node.get(store.editor, nextPath)
      if (node.type === 'code') {
        const ace = store.codes.get(node)
        if (ace) {
          EditorUtils.focusAceStart(ace)
        }
        return true
      } else {
        Transforms.select(store.editor, Editor.start(store.editor, nextPath))
      }
      EditorUtils.focus(store.editor)
      return true
    } else {
      return false
    }
  }
  static findPrev(editor: Editor, path: Path) {
    let curPath = path
    while (curPath) {
      if (Path.hasPrevious(curPath)) {
        const pre = Node.get(editor, Path.previous(curPath))
        if (['hr', 'break'].includes(pre?.type)) {
          curPath = Path.previous(path)
        } else if (['blockquote', 'list', 'list-item', 'table-row', 'table'].includes(pre?.type)) {
          return Editor.end(editor, Path.previous(curPath)).path.slice(0, -1)
        } else {
          return Path.previous(curPath)
        }
      } else if (curPath.length > 1) {
        curPath = curPath.slice(0, -1)
      } else {
        return null
      }
    }
    return null
  }
  static findNext(editor: Editor, path: Path) {
    let curPath = path
    while (curPath) {
      const nextPath = Path.next(curPath)
      if (Editor.hasPath(editor, nextPath)) {
        const next = Node.get(editor, nextPath)
        if (['hr', 'break'].includes(next?.type)) {
          curPath = nextPath
        } else if (['blockquote', 'list', 'list-item'].includes(next?.type)) {
          return Editor.start(editor, nextPath).path.slice(0, -1)
        } else {
          return nextPath
        }
      } else if (curPath.length > 1) {
        curPath = curPath.slice(0, -1)
      } else {
        return null
      }
    }
    return null
  }
  static findMediaInsertPath(editor: Editor) {
    const [cur] = Editor.nodes<any>(editor, {
      match: n => Element.isElement(n),
      mode: 'lowest'
    })
    if (!cur) return null
    let path = cur[1]
    if (cur[0].type === 'table-cell') {
      path = Path.next(Path.parent(Path.parent(cur[1])))
    }
    if (cur[0].type === 'head') {
      path = Path.next(path)
    }
    if (cur[0].type === 'code-line') {
      path = Path.next(Path.parent(cur[1]))
    }
    if (cur[0].type === 'paragraph' && Node.string(cur[0])) {
      path = Path.next(cur[1])
    }
    return path
  }
  static moveNodes(store: EditorStore, from: Path, to: Path, index = 1) {
    let count = 0
    while (Editor.hasPath(store.editor, from)) {
      if (count > 100) break
      const node = Editor.node(store.editor, from)
      // 刷新code元素缓存
      if (node[0].type === 'code') {
        store.clearCodeCache(node[0])
      }
      Transforms.moveNodes(store.editor, {
        at: from,
        to: [...to, index]
      })
      index++
      count++
    }
  }

  static focusAceEnd(editor: Ace.Editor) {
    const row = editor.session.getLength()
    const lineLength = editor.session.getLine(row - 1).length
    editor.clearSelection()
    editor.focus()
    editor.moveCursorTo(row - 1,  lineLength)
  }

  static focusAceStart(editor: Ace.Editor) {
    editor.focus()
    editor.clearSelection()
    editor.moveCursorTo(0, 0)
  }

  static clearAceMarkers(editor: Ace.Editor) {
    const markers = editor.session.getMarkers()
    for (let markerId in markers) {
      if (markers.hasOwnProperty(markerId)) {
        editor.session.removeMarker(+markerId)
      }
    }
  }
  static moveAfterSpace(editor: Editor, path: Path) {
    const next = Editor.next(editor, {at: path})
    if (!next || !Text.isText(next[0])) {
      Transforms.transform(editor, {
        type: 'insert_node',
        path: Path.next(path),
        node: {text: ''},
      })
      Transforms.select(editor, Path.next(path))
    } else {
      Transforms.move(editor, {unit: 'offset'})
    }
  }

  static moveBeforeSpace(editor: Editor, path: Path) {
    if (!Path.hasPrevious(path)) {
      Transforms.transform(editor, {
        type: 'insert_node',
        path: path,
        node: {text: ''},
      })
    }
    Transforms.move(editor, {unit: 'offset', reverse: true})
  }

  static clearMarks(editor: Editor, split = false) {
    if (!editor.selection) return
    Transforms.unsetNodes(editor, ['url', 'strikethrough', 'italic', 'code', 'bold', 'textColor', 'highColor'], {
      split,
      match: Text.isText
    })
  }
  static deleteAll(editor: Editor, insertNodes?: any[]) {
    const nodes = Array.from(Editor.nodes(editor, {
      at: [],
      match: n => Element.isElement(n),
      mode: 'highest',
      reverse: true
    }))
    if (nodes.length) {
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, nodes[nodes.length - 1][1]),
          focus: Editor.end(editor, nodes[0][1])
        }
      })
      Transforms.delete(editor, {at: [0]})
    }
    if (!insertNodes) insertNodes = [EditorUtils.p]
    Transforms.insertNodes(editor, insertNodes, {at: [0]})
  }

  static reset(editor: Editor, insertNodes?: any[], force?: boolean | History, sel?: BaseSelection) {
    if (!insertNodes) insertNodes = [EditorUtils.p]
    editor.children = insertNodes
    if (force) {
      editor.history = typeof force === 'boolean' ? {redos: [], undos: []} : force
    }
    editor.onChange()
  }

  static include(sel: Range, nodePath: Path) {
    const [start, end] = Range.edges(sel)
    Path.compare
    if (Path.compare(start.path, nodePath) === -1) {
      return Path.compare(end.path, nodePath) >= 0
    }
    if (Path.compare(end.path, nodePath) === 1) {
      return Path.compare(start.path, nodePath) <= 0
    }
    return true
  }
  static includeAll(editor: Editor, sel: Range, nodePath: Path) {
    const [start, end] = Range.edges(sel)
    return Point.compare(start, Editor.start(editor, nodePath)) !== 1 &&
      Point.compare(end, Editor.end(editor, nodePath)) !== -1
  }

  static copy(data: object) {
    return JSON.parse(JSON.stringify(data))
  }

  static cutText(editor: Editor, start: Point, end?: Point) {
    let leaf = Node.leaf(editor, start.path)
    let texts: CustomLeaf[] = [{...leaf, text: leaf.text?.slice(start.offset) || ''}]
    let next = Editor.next(editor, {at: start.path})
    while (next) {
      if (end && Path.equals(next[1], end.path)) {
        texts.push({
          ...next[0], text: next[0].text?.slice(0, end.offset) || ''
        })
        break
      } else {
        texts.push(next[0])
        next = Editor.next(editor, {at: next[1]})
      }
    }
    return texts
  }

  static isFormatActive(editor: Editor, format: string, value?: any) {
    try {
      const [match] = Editor.nodes(editor, {
        match: n => !!n[format],
        mode: 'lowest'
      })
      return value ? match?.[0]?.[format] === value : !!match
    } catch (e) {
      return false
    }
  }

  static getUrl(editor: Editor) {
    const [match] = Editor.nodes<any>(editor, {
      match: n => Text.isText(n) && !!n.url,
      mode: 'lowest'
    })
    return match?.[0].url as string || ''
  }

  static toggleFormat(editor: Editor, format: any) {
    const str = editor.selection ? Editor.string(editor, editor.selection) : ''
    if (str) {
      const isActive = EditorUtils.isFormatActive(editor, format)
      Transforms.setNodes(
        editor,
        {[format]: isActive ? null : true},
        {match: Text.isText, split: true}
      )
    }
  }

  static highColor(editor: Editor, color?: string) {
    Transforms.setNodes(
      editor,
      {'highColor': color},
      {match: Text.isText, split: true}
    )
  }

  static checkEnd(editor: Editor) {
    const [node] = Editor.nodes<any>(editor, {
      at: [],
      mode: 'highest',
      match: n => Element.isElement(n),
      reverse: true
    })
    if (node && node[0].type !== 'paragraph' || Node.string(node[0]) || (node[0].children?.length === 1 && node[0].children[0].type === 'media')) {
      Transforms.insertNodes(editor, EditorUtils.p, {
        at: Path.next(node[1])
      })
      setTimeout(() => {
        ReactEditor.focus(editor)
        Transforms.select(editor, Path.next(node[1]))
      })
      return true
    } else {
      return false
    }
  }

  static checkSelEnd(editor: Editor, path: Path) {
    let end = true
    let cur = Editor.node(editor, path)
    while (!Editor.isEditor(cur[0])) {
      if (Editor.hasPath(editor, Path.next(cur[1]))) {
        end = false
        break
      } else {
        cur = Editor.node(editor, Path.parent(cur[1]))
      }
    }
    return end
  }
  static findPath(editor: Editor, el: any) {
    try {
      return ReactEditor.findPath(editor, el)
    } catch (e) {
      console.error('find path error', e)
      return Editor.start(editor, []).path
    }
  }
}
