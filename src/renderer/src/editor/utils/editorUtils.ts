import {Editor, Element, Node, Path, Point, Range, Text, Transforms} from 'slate'
import {CustomLeaf} from '../../el'
import {History} from 'slate-history'
import {ReactEditor} from 'slate-react'

export class EditorUtils {
  static get p() {
    return {type: 'paragraph', children: [{text: ''}]}
  }

  static isDirtLeaf(leaf: CustomLeaf) {
    return leaf.bold || leaf.code || leaf.italic || leaf.strikethrough || !!leaf.url
  }

  static isTop(editor: Editor, path: Path) {
    const p = Editor.parent(editor, path)
    return Editor.isEditor(p[0])
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
    Transforms.unsetNodes(editor, ['url', 'strikethrough', 'italic', 'code', 'bold'], {
      split,
      match: Text.isText
    })
  }

  static reset(editor: Editor, insertNodes?: any[], force?: boolean | History) {
    const nodes = Editor.nodes(editor, {
      at: [],
      match: n => Element.isElement(n),
      mode: 'highest',
      reverse: true
    })
    if (!insertNodes) insertNodes = [{type: 'paragraph', children: [{text: ''}]}]
    for (let n of Array.from(nodes)) {
      Transforms.delete(editor, {at: n[1]})
    }
    Transforms.insertNodes(editor, insertNodes, {at: [0]})
    if (force) {
      Transforms.select(editor, Editor.start(editor, [0]))
      editor.history = typeof force === 'boolean' ? {redos: [], undos: []} : force
    }
  }

  static includeAll(editor: Editor, sel: Range, nodePath: Path) {
    const [start, end] = Range.edges(sel)
    return Point.compare(start, Editor.start(editor, nodePath)) !== 1 &&
      Point.compare(end, Editor.end(editor, nodePath)) !== -1
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

  static isFormatActive(editor: Editor, format) {
    const [match] = Editor.nodes(editor, {
      match: n => !!n[format],
      mode: 'lowest'
    })
    return !!match
  }

  static getUrl(editor: Editor) {
    const [match] = Editor.nodes<any>(editor, {
      match: n => Text.isText(n) && !!n.url,
      mode: 'lowest'
    })
    return match?.[0].url
  }

  static toggleFormat(editor: Editor, format: any) {
    const selection = window.getSelection()
    const node = selection?.getRangeAt(0).startContainer.parentNode as HTMLElement
    if (node?.dataset?.slateString) {
      const isActive = EditorUtils.isFormatActive(editor, format)
      Transforms.setNodes(
        editor,
        {[format]: isActive ? null : true},
        {match: Text.isText, split: true}
      )
    }
  }

  static checkEnd(editor: Editor) {
    const [node] = Editor.nodes<any>(editor, {
      at: [],
      mode: 'highest',
      match: n => Element.isElement(n),
      reverse: true
    })
    if (node[0].type !== 'paragraph' || Node.string(node[0])) {
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
}
