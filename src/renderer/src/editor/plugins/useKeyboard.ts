import React, {useMemo} from 'react'
import {Editor, Element, Node, Path, Point, Range, Text, Transforms} from 'slate'
import {TabKey} from './hotKeyCommands/tab'
import {EnterKey} from './hotKeyCommands/enter'
import {BackspaceKey} from './hotKeyCommands/backspace'
import {MatchKey} from './hotKeyCommands/match'
import {keyArrow} from './hotKeyCommands/arrow'
import {EditorUtils} from '../utils/editorUtils'
import isHotkey from 'is-hotkey'
import {MainApi} from '../../api/main'
import {EditorStore} from '../store'
import {runInAction} from 'mobx'

export const useKeyboard = (store: EditorStore) => {
  return useMemo(() => {
    const tab = new TabKey(store.editor)
    const backspace = new BackspaceKey(store.editor)
    const enter = new EnterKey(store, backspace)
    const match = new MatchKey(store.editor)
    return (e: React.KeyboardEvent) => {
      if (isHotkey('backspace', e) && store.editor.selection) {
        if (Range.isCollapsed(store.editor.selection)) {
          if (backspace.run()) e.preventDefault()
        } else {
          if (backspace.range()) e.preventDefault()
        }
        return
      }
      if (isHotkey('mod+shift+v', e)) {
        e.preventDefault()
        return MainApi.sendToSelf('key-task', 'paste-plain-text')
      }
      if (isHotkey('mod+alt+v', e) || isHotkey('mod+opt+v', e)) {
        e.preventDefault()
        return MainApi.sendToSelf('key-task', 'paste-markdown-code')
      }

      if (isHotkey('mod+a', e) && store.editor.selection) {
        const [code] = Editor.nodes(store.editor, {
          match: n => Element.isElement(n) && n.type === 'code'
        })
        if (code) {
          Transforms.select(store.editor, {
            anchor: Editor.start(store.editor, code[1]),
            focus: Editor.end(store.editor, code[1])
          })
          e.preventDefault()
        }
      }
      match.run(e)
      if (isHotkey('mod+backspace', e)) {
        const [inlineKatex] = Editor.nodes<any>(store.editor, {
          match: n => Element.isElement(n) && n.type === 'inline-katex'
        })
        if (inlineKatex && Node.string(inlineKatex[0])) {
          e.preventDefault()
          Transforms.delete(store.editor, {
            at: {
              anchor: Editor.start(store.editor, inlineKatex[1]),
              focus: Editor.end(store.editor, inlineKatex[1])
            },
            unit: 'character'
          })
        } else {
          EditorUtils.clearMarks(store.editor)
        }
      }

      if (e.key.toLowerCase().startsWith('arrow')) {
        if (store.openLangCompletion && ['ArrowUp', 'ArrowDown'].includes(e.key)) return
        keyArrow(store.editor, e)
      } else {
        if (e.key === 'Tab') tab.run(e)
        if (e.key === 'Enter') {
          if (store.openLangCompletion) {
            setTimeout(() => {
              runInAction(() => store.openLangCompletion = false)
            })
          } else {
            enter.run(e)
          }
        }
        const [node] = Editor.nodes<any>(store.editor, {
          match: n => Element.isElement(n),
          mode: 'lowest'
        })
        let str = Node.string(node[0]) || ''
        if (node[0].type === 'paragraph') {
          if (e.key === 'Enter' && /^<[a-z]+[\s"'=:;()\w\-\[\]]*>/.test(str)) {
            Transforms.delete(store.editor, {at: node[1]})
            Transforms.insertNodes(store.editor, {
              type: 'code', language: 'html', render: true,
              children: str.split('\n').map(s => {
                return {type: 'code-line', children: [{text: s}]}
              })
            }, {select: true, at: node[1]})
            e.preventDefault()
            return
          }
          setTimeout(() => {
            const [node] = Editor.nodes<any>(store.editor, {
              match: n => Element.isElement(n),
              mode: 'lowest'
            })
            if (node && node[0].type === 'paragraph' && (e.key === 'Backspace' || /^[\w+\-#]$/.test(e.key))) {
              let str = Node.string(node[0]) || ''
              const codeMatch = str.match(/^```([\w+\-#]+)$/i)
              if (codeMatch) {
                runInAction(() => store.openLangCompletion = true)
                store.langCompletionText.next(codeMatch[1])
              } else if (store.openLangCompletion) {
                runInAction(() => store.openLangCompletion = false)
              }
            } else {
              runInAction(() => store.openLangCompletion = false)
            }
          })
        }
      }
    }
  }, [store.editor])
}
