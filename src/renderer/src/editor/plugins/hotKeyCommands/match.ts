import { Editor, Element, Node, NodeEntry, Range } from 'slate'
import React from 'react'
import { TextMatchNodes } from '../elements'

export class MatchKey {
  constructor(
    private readonly editor: Editor,
  ) {
  }

  private createParams(node: NodeEntry, match: RegExpMatchArray) {
    return {
      el: node[0],
      path: node[1],
      editor: this.editor,
      sel: this.editor.selection!,
      match,
      startText: match[0]
    }
  }

  run(e: React.KeyboardEvent) {
    const [node] = Editor.nodes<Element>(this.editor, {
      match: n => Element.isElement(n),
      mode: 'lowest'
    })
    if (!node || ['code'].includes(node[0].type)) return
    const sel = this.editor.selection
    if (!sel || !Range.isCollapsed(sel)) return
    for (let n of TextMatchNodes) {
      if (typeof n.matchKey === 'object' ? n.matchKey.test(e.key) : n.matchKey === e.key) {
        if (n.checkAllow && !n.checkAllow({editor: this.editor, node, sel})) continue
        const str = Node.string(Node.leaf(this.editor, sel.anchor.path)).slice(0, sel.anchor.offset) + e.key
        const m = str.match(n.reg)
        if (m) {
          if (n.run(this.createParams(node, m))) {
            e.preventDefault()
            break
          }
        }
      }
    }
  }
}
