import { useCallback, useEffect } from 'react'
import isHotkey from 'is-hotkey'
import { action, runInAction } from 'mobx'
import { Editor, Element, Transforms } from 'slate'
import { Subject } from 'rxjs'
import { ReactEditor } from 'slate-react'
import { message$ } from '../utils'
import { EditorUtils } from '../editor/utils/editorUtils'
import { Methods } from '../types/index'
import { useSubject } from './subscribe'
import { isAbsolute, join } from 'path'
import { AttachNode, MediaNode } from '../types/el'
import { openConfirmDialog$ } from '../components/Dialog/ConfirmDialog'
import { KeyboardTask } from '../store/logic/keyboard'
import { useCoreContext } from '../store/core'

export const keyTask$ = new Subject<{
  key: Methods<KeyboardTask>
  args?: any[]
}>()

const keyMap: [string, Methods<KeyboardTask>, any[]?, boolean?][] = [
  ['mod+shift+l', 'selectLine'],
  ['mod+e', 'selectFormat'],
  ['mod+d', 'selectWord'],
  ['mod+a', 'selectAll'],
  ['mod+enter', 'lineBreakWithinParagraph'],
  ['mod+option+v', 'pasteMarkdownCode'],
  ['mod+shift+v', 'pastePlainText'],
  ['mod+1', 'head', [1]],
  ['mod+2', 'head', [2]],
  ['mod+3', 'head', [3]],
  ['mod+4', 'head', [4]],
  ['mod+0', 'paragraph'],
  ['mod+]', 'increaseHead'],
  ['mod+[', 'decreaseHead'],
  ['option+q', 'insertQuote'],
  ['mod+option+t', 'insertTable'],
  ['mod+option+c', 'insertCode'],
  ['mod+option+k', 'inlineKatex'],
  ['mod+k', 'insertCode', ['katex']],
  ['mod+option+/', 'horizontalLine'],
  ['mod+option+o', 'list', ['ordered']],
  ['mod+option+u', 'list', ['unordered']],
  ['mod+option+s', 'list', ['task']],
  ['mod+b', 'format', ['bold']],
  ['mod+i', 'format', ['italic']],
  ['mod+shift+s', 'format', ['strikethrough']],
  ['option+`', 'format', ['code']],
  ['mod+\\', 'clear'],
  ['mod+option+p', 'image'],
  ['mod+p', 'localImage'],
  ['mod+shift+p', 'insertMedia'],
  ['mod+f', 'openSearch'],
  ['mod+s', 'save'],
  ['option+n', 'newNote', [], true],
  ['mod+option+m', 'insertCode', ['mermaid']]
]
export const useSystemKeyboard = () => {
  const core = useCoreContext()
  useSubject(keyTask$, ({ key, args }) => {
    if (core.tree.root && key === 'quickOpen') {
      core.keyboard.quickOpen()
      return
    }
    if (!core.tree.currentTab?.current && !['newNote', 'openNote'].includes(key)) return
    if (!core.tree.currentTab?.store.focus && !['newNote', 'openNote', 'blur'].includes(key)) {
      ReactEditor.focus(core.tree.currentTab.store.editor)
    }
    // @ts-ignore
    core.keyboard[key](...(args || []))
  })
  const keydown = useCallback(
    action((e: KeyboardEvent) => {
      const store = core.tree.currentTab?.store
      if (isHotkey('mod+,', e)) {
        e.preventDefault()
        runInAction(() => {
          core.config.visible = true
          core.tree.selectItem = null
        })
        core.keyboard.blur()
      }
      if (isHotkey('mod+n', e)) {
        core.keyboard.newNote()
        return
      }
      if (!store) return
      if (core.tree.selectItem && isHotkey('mod+backspace', e)) {
        core.tree.moveToTrash(core.tree.selectItem)
      }
      if (isHotkey('mod+f', e)) {
        e.preventDefault()
        return core.keyboard.openSearch()
      }
      if (isHotkey('esc', e)) {
        if (store.openSearch) {
          store.setOpenSearch(false)
        }
      }
      if (isHotkey('mod+c', e) || isHotkey('mod+x', e)) {
        const [node] = Editor.nodes<MediaNode | AttachNode>(store.editor, {
          mode: 'lowest',
          match: (m) => Element.isElement(m) && (m.type === 'media' || m.type === 'attach')
        })
        if (!node) return
        let readlUrl = node[0].url as string
        readlUrl =
          !readlUrl.startsWith('http') && !isAbsolute(readlUrl)
            ? join(core.tree.openedNote!.filePath, '..', readlUrl)
            : readlUrl
        if (node[0].type === 'media') {
          const url = `media://file?url=${readlUrl}&height=${node[0].height || ''}`
          window.api.copyToClipboard(url)
          if (isHotkey('mod+x', e)) {
            Transforms.delete(store.editor, { at: node[1] })
            ReactEditor.focus(store.editor)
          } else {
            message$.next({
              type: 'success',
              content: 'Image address copied to clipboard'
            })
          }
        }
        if (node[0].type === 'attach') {
          const url = `attach://file?size=${node[0].size}&name=${node[0].name}&url=${node[0].url}`
          window.api.copyToClipboard(url)
          if (isHotkey('mod+x', e)) {
            Transforms.delete(store.editor, { at: node[1] })
            ReactEditor.focus(store.editor)
          } else {
            message$.next({
              type: 'success',
              content: 'Image address copied to clipboard'
            })
          }
        }
      }
      if (isHotkey('mod+v', e)) {
        const copyPath = window.api.getClipboardFilePath()
        if (copyPath && core.tree.selectItem?.folder && core.tree.root) {
          const cur = core.tree.selectItem
          openConfirmDialog$.next({
            title: 'Note',
            description: `Do you want to paste the file ${copyPath} into the current folder?`,
            okType: 'primary',
            onConfirm: () => {
              core.node.moveFileToSpace(copyPath, cur, true)
            }
          })
        }
      }
      if (isHotkey('mod+o', e)) {
        e.preventDefault()
        core.keyboard.quickOpen()
      }
      if (isHotkey('backspace', e)) {
        if (!store.focus) return
        const [node] = core.keyboard.curNodes
        if (node?.[0].type === 'media') {
          e.preventDefault()
          Transforms.removeNodes(core.curEditor, { at: node[1] })
          Transforms.insertNodes(core.curEditor, EditorUtils.p, {
            at: node[1],
            select: true
          })
          ReactEditor.focus(core.curEditor)
        }
      }
      if (!core.tree.currentTab.current || !core.tree.currentTab.store.focus) return
      // if (isHotkey('arrowUp', e) || isHotkey('arrowDown', e)) {
      //   const [node] = core.keyboard.curNodes
      //   if (node?.[0].type === 'media') {
      //     e.preventDefault()
      //     if (isHotkey('arrowUp', e)) {
      //       EditorUtils.selectPrev(store, node[1])
      //     } else {
      //       EditorUtils.selectNext(store, node[1])
      //     }
      //     ReactEditor.focus(core.curEditor)
      //   }
      // }
      for (let key of keyMap) {
        if (isHotkey(key[0], e)) {
          e.preventDefault()
          e.stopPropagation()
          if (!key[3] && !core.tree.currentTab.store.focus) return
          // @ts-ignore
          core.keyboard[key[1]](...(key[2] || []))
          break
        }
      }
    }),
    []
  )

  const system = useCallback((e: any, taskKey: string, ...args: any[]) => {
    if (core.keyboard[taskKey]) {
      core.keyboard[taskKey](...args)
    }
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.on('key-task', system)
    window.addEventListener('keydown', keydown)
    return () => {
      window.window.electron.ipcRenderer.removeListener('key-task', system)
      window.removeEventListener('keydown', keydown)
    }
  }, [])
}
