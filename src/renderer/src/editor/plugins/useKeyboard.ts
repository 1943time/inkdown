import React, { useMemo } from 'react'
import { Editor, Element, Node, Path, Range, Text, Transforms } from 'slate'
import { TabKey } from './hotKeyCommands/tab'
import { EnterKey } from './hotKeyCommands/enter'
import { BackspaceKey } from './hotKeyCommands/backspace'
import { MatchKey } from './hotKeyCommands/match'
import { keyArrow } from './hotKeyCommands/arrow'
import { EditorUtils } from '../utils/editorUtils'
import isHotkey from 'is-hotkey'
import { MainApi } from '../../api/main'
import { EditorStore } from '../store'
import { runInAction } from 'mobx'
import { Core } from '../../store/core'

export const useKeyboard = (core: Core, store: EditorStore) => {
  return useMemo(() => {
    const tab = new TabKey(core, store)
    const backspace = new BackspaceKey(store)
    const enter = new EnterKey(store, backspace)
    const match = new MatchKey(store.editor)
    return (e: React.KeyboardEvent) => {
      if (store.openInsertCompletion && (isHotkey('up', e) || isHotkey('down', e))) {
        e.preventDefault()
        return
      }
      if (isHotkey('mod+z', e) || isHotkey('mod+shift+z', e)) {
        store.doManual()
      }
      if (isHotkey('mod+ArrowDown', e)) {
        e.preventDefault()
        Transforms.select(store.editor, Editor.end(store.editor, []))
      }
      if (isHotkey('mod+ArrowUp', e)) {
        e.preventDefault()
        Transforms.select(store.editor, Editor.start(store.editor, []))
      }
      if (isHotkey('backspace', e) && store.editor.selection) {
        if (Range.isCollapsed(store.editor.selection)) {
          if (backspace.run()) {
            e.stopPropagation()
            e.preventDefault()
          }
        } else {
          if (backspace.range()) e.preventDefault()
        }
      }
      if (isHotkey('mod+shift+v', e)) {
        e.preventDefault()
        return MainApi.sendToSelf('key-task', 'paste-plain-text')
      }
      if (isHotkey('mod+alt+v', e) || isHotkey('mod+opt+v', e)) {
        e.preventDefault()
        return MainApi.sendToSelf('key-task', 'paste-markdown-code')
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
        keyArrow(store, e)
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
        if (!node) return
        const [text] = Editor.nodes<any>(store.editor, {
          match: Text.isText,
          mode: 'lowest'
        })
        if (e.key === '@' && ['paragraph', 'head', 'table-cell'].includes(node[0].type)) {
          if (text) {
            const dirt = EditorUtils.isDirtLeaf(text[0])
            if (!dirt) {
              runInAction(() => (store.openQuickLinkComplete = true))
            }
          }
        } else if (store.openQuickLinkComplete && text) {
          setTimeout(() => {
            const [text] = Editor.nodes<any>(store.editor, {
              match: Text.isText,
              mode: 'lowest'
            })
            const str = Node.string(text[0])
            const startStr = str.slice(0, store.editor.selection?.anchor.offset)
            const quickMatch = startStr.match(/@([^\n@]+)$/)
            store.quickLinkText$.next(quickMatch?.[1])
          })
        }
        if (e.key.toLowerCase() === 'backspace' && store.openQuickLinkComplete && text) {
          if (e.metaKey) {
            runInAction(() => (store.openQuickLinkComplete = false))
          } else {
            const str = Node.string(text[0])
            const startStr = str.slice(0, store.editor.selection?.anchor.offset)
            const quickMatch = startStr.match(/@$/)
            if (quickMatch) {
              runInAction(() => (store.openQuickLinkComplete = false))
            }
          }
        }
        let str = Node.string(node[0]) || ''
        if (node[0].type === 'paragraph') {
          // if (e.key === 'Enter' && /^<[a-z]+[\s"'=:;()\w\-\[\]]*>/.test(str)) {
          //   Transforms.delete(store.editor, {at: node[1]})
          //   Transforms.insertNodes(store.editor, {
          //     type: 'code', language: 'html', render: true, code: str,
          //     children: [{text: ''}]
          //   }, {select: true, at: node[1]})
          //   e.preventDefault()
          //   return
          // }
          setTimeout(() => {
            const [node] = Editor.nodes<any>(store.editor, {
              match: n => Element.isElement(n) && n.type === 'paragraph',
              mode: 'lowest'
            })
            if (node && node[0].children.length === 1 && !EditorUtils.isDirtLeaf(node[0].children[0]) && (e.key === 'Backspace' || /^[^\n]$/.test(e.key))) {
              let str = Node.string(node[0]) || ''
              const codeMatch = str.match(/^```([\w+\-#]+)$/i)
              if (codeMatch) {
                runInAction(() => store.openLangCompletion = true)
                setTimeout(() => {
                  store.langCompletionText.next(codeMatch[1])
                })
              } else {
                const insertMatch = str.match(/^\/([^\n]+)?$/i)
                if (insertMatch && !(!Path.hasPrevious(node[1]) && Node.parent(store.editor, node[1]).type === 'list-item')) {
                  runInAction(() => store.openInsertCompletion = true)
                  setTimeout(() => {
                    store.insertCompletionText$.next(insertMatch[1])
                  })
                } else {
                  if (store.openInsertCompletion || store.openLangCompletion) {
                    runInAction(() => {
                      store.openLangCompletion = false
                      store.openInsertCompletion = false
                    })
                  }
                }
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
