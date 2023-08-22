import React, {useMemo} from 'react'
import {Editor, Element, Node, Path, Point, Range, Text, Transforms} from 'slate'
import {TabKey} from './hotKeyCommands/tab'
import {EnterKey} from './hotKeyCommands/enter'
import {BackspaceKey} from './hotKeyCommands/backspace'
import {MatchKey} from './hotKeyCommands/match'
import {keyArrow} from './hotKeyCommands/arrow'
import {isMix} from '../output'
import {EditorUtils} from '../utils/editorUtils'
import isHotkey from 'is-hotkey'

const textNodes = new Set(['table-row', 'code-line', 'paragraph', 'head'])
export const useKeyboard = (editor: Editor) => {
  return useMemo(() => {
    const tab = new TabKey(editor)
    const backspace = new BackspaceKey(editor)
    const enter = new EnterKey(editor, backspace)
    const match = new MatchKey(editor)
    return (e: React.KeyboardEvent) => {
      if (isHotkey('mod+a', e) && editor.selection) {
        const [code] = Editor.nodes(editor, {
          match: n => Element.isElement(n) && n.type === 'code'
        })
        if (code) {
          Transforms.select(editor, {
            anchor: Editor.start(editor, code[1]),
            focus: Editor.end(editor, code[1])
          })
          e.preventDefault()
        }
      }
      match.run(e)
      if (isHotkey('mod+backspace', e)) {
        EditorUtils.clearMarks(editor)
      }
      if (e.key.toLowerCase().startsWith('arrow')) {
        keyArrow(editor, e)
      } else {
        if (e.key === 'Tab') tab.run(e)
        if (e.key === 'Enter') {
          const [node] = Editor.nodes<any>(editor, {
            match: n => Element.isElement(n),
            mode: 'lowest'
          })
          if (node[0].type === 'paragraph') {
            const str = Node.string(node[0])
            if (/^<[a-z]+[\s"'=:;()\w\-\[\]]*>/.test(str)) {
              Transforms.delete(editor, {at: node[1]})
              Transforms.insertNodes(editor, {
                type: 'code', language: 'html', render: true,
                children: str.split('\n').map(s => {
                  return {type: 'code-line', children: [{text: s}]}
                })
              }, {select: true, at: node[1]})
              e.preventDefault()
              return
            }
          }
          enter.run(e)
        }
      }
    }
  }, [editor])
}
