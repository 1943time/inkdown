import {BaseSelection, Editor, Element, Node, Path, Point, Range, Text, Transforms} from 'slate'
import {CustomLeaf} from '../../el'
import {History} from 'slate-history'
import {ReactEditor} from 'slate-react'
import {clearCodeCache} from '../plugins/useHighlight'

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
  static findPrev(editor: Editor, path: Path) {
    while (path.length) {
      if (Path.hasPrevious(path)) {
        if (Node.get(editor, Path.previous(path))?.type === 'hr') {
          path = Path.previous(path)
        } else {
          return Path.previous(path)
        }
      } else {
        path = Path.parent(path)
      }
    }
    return []
  }
  static findNext(editor: Editor, path: Path) {
    while (path.length) {
      if (Editor.hasPath(editor, Path.next(path))) {
        if (Node.get(editor, Path.next(path))?.type === 'hr') {
          path = Path.next(path)
        } else {
          return Path.next(path)
        }
      } else {
        path = Path.parent(path)
      }
    }
    return []
  }
  static moveNodes(editor: Editor, from: Path, to: Path, index = 1) {
    let count = 0
    while (Editor.hasPath(editor, from)) {
      if (count > 100) break
      const node = Editor.node(editor, from)
      // 刷新code元素缓存
      if (node[0].type === 'code') clearCodeCache(node[0])
      Transforms.moveNodes(editor, {
        at: from,
        to: [...to, index]
      })
      index++
      count++
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
    if (sel) {
      editor.selection = sel
    } else {
      const start = Editor.start(editor, [])
      editor.selection = {
        anchor: start,
        focus: start
      }
    }
    editor.onChange()
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
    return match?.[0].url
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
