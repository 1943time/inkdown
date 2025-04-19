import React, { useMemo } from 'react'
import { Editor, Element, Node, Path, Range, Text, Transforms } from 'slate'
import { TabKey } from './hotKeyCommands/tab'
import { EnterKey } from './hotKeyCommands/enter'
import { BackspaceKey } from './hotKeyCommands/backspace'
import { MatchKey } from './hotKeyCommands/match'
import { keyArrow } from './hotKeyCommands/arrow'
import { EditorUtils } from '../utils/editorUtils'
import isHotkey from 'is-hotkey'
import { TabStore } from '@/store/note/tab'

export const useKeyboard = (tab: TabStore) => {
  return useMemo(() => {
    const tabKey = new TabKey(tab)
    const backspace = new BackspaceKey(tab)
    const enter = new EnterKey(tab, backspace)
    const match = new MatchKey(tab)
    return (e: React.KeyboardEvent) => {
      const state = tab.state
      if (state.openInsertCompletion && (isHotkey('up', e) || isHotkey('down', e))) {
        e.preventDefault()
        return
      }
      if (isHotkey('mod+z', e) || isHotkey('mod+shift+z', e)) {
        tab.doManual()
      }
      if (isHotkey('mod+ArrowDown', e)) {
        e.preventDefault()
        Transforms.select(tab.editor, Editor.end(tab.editor, []))
      }
      if (isHotkey('mod+ArrowUp', e)) {
        e.preventDefault()
        Transforms.select(tab.editor, Editor.start(tab.editor, []))
      }
      if (isHotkey('backspace', e) && tab.editor.selection) {
        if (Range.isCollapsed(tab.editor.selection)) {
          if (backspace.run()) {
            e.stopPropagation()
            e.preventDefault()
          }
        } else {
          if (backspace.range()) e.preventDefault()
        }
      }
      match.run(e)
      if (isHotkey('mod+backspace', e)) {
        if (e.metaKey) {
          setTimeout(() => {
            EditorUtils.clearMarks(tab.editor)
          })
        }
        const [inlineKatex] = Editor.nodes<any>(tab.editor, {
          match: (n) => Element.isElement(n) && n.type === 'inline-katex'
        })
        if (inlineKatex && Node.string(inlineKatex[0])) {
          e.preventDefault()
          Transforms.delete(tab.editor, {
            at: {
              anchor: Editor.start(tab.editor, inlineKatex[1]),
              focus: Editor.end(tab.editor, inlineKatex[1])
            },
            unit: 'character'
          })
        } else {
          EditorUtils.clearMarks(tab.editor)
        }
      }

      if (e.key.toLowerCase().startsWith('arrow')) {
        if (state.openLangCompletion && ['ArrowUp', 'ArrowDown'].includes(e.key)) return
        keyArrow(tab, e)
      } else {
        if (e.key === 'Tab') tabKey.run(e)
        if (e.key === 'Enter') {
          if (state.openLangCompletion) {
            setTimeout(() => {
              tab.setState({ openLangCompletion: false })
            })
          } else {
            enter.run(e)
          }
        }
        const [node] = Editor.nodes<any>(tab.editor, {
          match: (n) => Element.isElement(n),
          mode: 'lowest'
        })
        if (!node) return
        const [text] = Editor.nodes<any>(tab.editor, {
          match: Text.isText,
          mode: 'lowest'
        })
        let str = Node.string(node[0]) || ''
        if (node[0].type === 'paragraph') {
          if (
            isHotkey('enter', e) &&
            /^\s*---\s*$/.test(str) &&
            !Path.hasPrevious(node[1]) &&
            EditorUtils.isTop(tab.editor, node[1])
          ) {
            EditorUtils.insertCodeFence({
              editor: tab.editor,
              codes: tab.codeMap,
              opt: {
                language: 'yaml',
                children: [{ text: '' }],
                code: '',
                frontmatter: true
              },
              path: node[1]
            })
            e.preventDefault()
            return
          }
          if (isHotkey('enter', e) && /^```\s*$/.test(str)) {
            EditorUtils.insertCodeFence({
              editor: tab.editor,
              codes: tab.codeMap,
              opt: {
                language: '',
                children: [{ text: '' }],
                code: ''
              },
              path: node[1]
            })
            e.preventDefault()
            return
          }
          if (e.key === 'Enter' && /^<[a-z]+[\s"'=:;()\w\-\[\]]*>/.test(str)) {
            EditorUtils.insertCodeFence({
              editor: tab.editor,
              codes: tab.codeMap,
              opt: {
                language: 'html',
                render: true,
                code: str,
                children: [{ text: '' }]
              },
              path: node[1]
            })
            e.preventDefault()
            return
          }
          setTimeout(() => {
            const [node] = Editor.nodes<any>(tab.editor, {
              match: (n) => Element.isElement(n) && n.type === 'paragraph',
              mode: 'lowest'
            })
            if (
              node &&
              node[0].children.length === 1 &&
              !EditorUtils.isDirtLeaf(node[0].children[0]) &&
              (e.key === 'Backspace' || /^[^\n]$/.test(e.key))
            ) {
              let str = Node.string(node[0]) || ''
              const codeMatch = str.match(/^```([\w+\-#]+)$/i)
              if (codeMatch) {
                tab.setState({
                  openLangCompletion: true,
                  langCompletionText: codeMatch[1]
                })
              } else {
                const insertMatch = str.match(/^\/([^\n]+)?$/i)
                if (
                  insertMatch &&
                  !(
                    !Path.hasPrevious(node[1]) &&
                    Node.parent(tab.editor, node[1]).type === 'list-item'
                  )
                ) {
                  tab.setState({
                    openInsertCompletion: true,
                    insertCompletionText: insertMatch[1]
                  })
                } else {
                  if (state.openInsertCompletion || state.openLangCompletion) {
                    tab.setState({
                      openLangCompletion: false,
                      openInsertCompletion: false
                    })
                  }
                }
              }
            } else {
              tab.setState({ openLangCompletion: false })
            }
          })
        }
      }
    }
  }, [tab.editor])
}
