import { Editor, Element, Node, NodeEntry, Range } from 'slate'
import React from 'react'
import { TextMatchNodes } from '../elements'
import { TabStore } from '@/store/note/tab'

export class MatchKey {
  private timer = 0
  get editor() {
    return this.tab.editor
  }
  constructor(private readonly tab: TabStore) {}

  private createParams(node: NodeEntry, match: RegExpMatchArray) {
    return {
      el: node[0],
      path: node[1],
      editor: this.editor,
      sel: this.editor.selection!,
      match,
      startText: match[0],
      tab: this.tab
    }
  }

  run(e: React.KeyboardEvent) {
    const [node] = Editor.nodes<Element>(this.editor, {
      match: (n) => Element.isElement(n),
      mode: 'lowest'
    })
    if (!node || ['code'].includes(node[0].type)) return
    const sel = this.editor.selection
    if (!sel || !Range.isCollapsed(sel)) return
    const leaf = Node.leaf(this.editor, sel.anchor.path)
    if (!leaf) return
    for (let n of TextMatchNodes) {
      // 配置开启
      if (n.type === 'inlineKatex' && !this.tab.store.settings.state.autoConvertInlineFormula) {
        continue
      }
      if (typeof n.matchKey === 'object' ? n.matchKey.test(e.key) : n.matchKey === e.key) {
        if (n.checkAllow && !n.checkAllow({ editor: this.editor, node, sel })) continue
        try {
          const str = Node.string(leaf).slice(0, sel.anchor.offset) + e.key
          const m = str.match(n.reg)
          if (m) {
            if (n.run(this.createParams(node, m))) {
              e.preventDefault()
            }
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }
}
