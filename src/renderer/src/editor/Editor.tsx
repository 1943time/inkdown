import React, { useCallback, useEffect, useRef } from 'react'
import { Editable, ReactEditor, Slate } from 'slate-react'
import { Editor, Element, Node, Range, Transforms } from 'slate'
import { MElement, MLeaf } from './elements'
import { clearAllCodeCache, SetNodeToDecorations, useHighlight } from './plugins/useHighlight'
import { useKeyboard } from './plugins/useKeyboard'
import { useOnchange } from './plugins/useOnchange'
import { observer } from 'mobx-react-lite'
import { IFileItem } from '../types/index'
import { EditorUtils } from './utils/editorUtils'
import { useEditorStore } from './store'
import { action, runInAction } from 'mobx'
import { useSubject } from '../hooks/subscribe'
import { ipcRenderer } from 'electron'
import { isAbsolute, join, relative } from 'path'
import { existsSync } from 'fs'
import { ErrorBoundary, ErrorFallback } from '../components/ErrorBoundary'
import { Title } from './tools/Title'
import { mediaType } from './utils/dom'
import { toUnixPath } from '../utils/path'
import { useCoreContext } from '../store/core'
import { htmlToMarkdown } from '../utils'

export const MEditor = observer(({ note }: { note: IFileItem }) => {
  const core = useCoreContext()
  const store = useEditorStore()
  const changedMark = useRef(false)
  const editor = store.editor
  const value = useRef<any[]>([EditorUtils.p])
  const high = useHighlight(store)
  const saveTimer = useRef(0)
  const nodeRef = useRef<IFileItem>()
  const renderElement = useCallback(
    (props: any) => <MElement {...props} children={props.children} />,
    []
  )
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children} />, [])
  const keydown = useKeyboard(core, store)
  const onChange = useOnchange(editor, store)
  const first = useRef(true)
  const save = useCallback(async () => {
    ipcRenderer.send('file-saved')
    const node = nodeRef.current
    changedMark.current = false
    if (node?.schema && store.docChanged && !node.ghost) {
      runInAction(() => {
        store.docChanged = false
      })
      window.electron.ipcRenderer.send('file-saved')
      core.node.updateNode(node)
    }
  }, [note])

  useSubject(store.saveDoc$, (data) => {
    if (data && nodeRef.current) {
      store.initializing = true
      editor.selection = null
      EditorUtils.reset(editor, data, nodeRef.current.history)
      store.doRefreshHighlight()
      store.docChanged$.next(true)
      requestIdleCallback(() => {
        save()
        store.initializing = false
      })
    } else {
      save()
    }
  })

  const change = useCallback(
    (v: any[]) => {
      if (first.current) {
        setTimeout(() => {
          first.current = false
        }, 100)
        return
      }
      value.current = v
      onChange(v, editor.operations)
      if (note) {
        note.schema = v
        note.history = editor.history
        note.sel = editor.selection
      }
      if (editor.operations[0]?.type === 'set_selection') {
        try {
          if (store.openInsertCompletion || store.openQuickLinkComplete) {
            runInAction(() => {
              store.openLangCompletion = false
              store.openQuickLinkComplete = false
            })
            core.tree.currentTab.range = document.getSelection()?.getRangeAt(0)
          }
        } catch (e) {}
      }
      if (!editor.operations?.every((o) => o.type === 'set_selection')) {
        if (!changedMark.current) {
          changedMark.current = true
          ipcRenderer.send('file-changed')
        }
        store.docChanged$.next(true)
        runInAction(() => {
          note.refresh = !note.refresh
          store.docChanged = true
        })
        clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => {
          save()
        }, 3000)
      }
    },
    [note]
  )

  const initialNote = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (note && ['md', 'markdown'].includes(note.ext || '')) {
      nodeRef.current = note
      store.setState((state) => {
        state.pauseCodeHighlight = true
      })
      first.current = true
      store.initializing = true
      try {
        EditorUtils.reset(
          editor,
          note.schema?.length ? note.schema : undefined,
          note.history || true
        )
        clearAllCodeCache(editor)
        store.docChanged$.next(true)
      } catch (e) {
        EditorUtils.deleteAll(editor)
      }
      requestIdleCallback(() => {
        store.initializing = false
        store.setState((state) => (state.pauseCodeHighlight = false))
        requestIdleCallback(() => {
          store.setState((state) => (state.refreshHighlight = !state.refreshHighlight))
        })
      })
    } else {
      nodeRef.current = undefined
    }
  }, [note])

  useEffect(() => {
    save()
    if (note === core.tree.openedNote && nodeRef.current !== note) {
      initialNote()
    }
  }, [note, editor, core.tree.openedNote])

  useEffect(() => {
    const blur = async () => {
      clearTimeout(saveTimer.current)
      await save()
    }
    window.electron.ipcRenderer.on('window-close', blur)
    window.electron.ipcRenderer.on('window-blur', blur)
    return () => {
      window.electron.ipcRenderer.removeListener('window-blur', blur)
    }
  }, [editor])

  useSubject(
    core.tree.externalChange$,
    (changeNote) => {
      if (changeNote === note) {
        try {
          first.current = true
          ReactEditor.blur(editor)
          EditorUtils.deleteAll(editor, changeNote.schema)
        } catch (e) {}
      }
    },
    [note]
  )

  const checkEnd = useCallback(
    (e: React.MouseEvent) => {
      if (!store.focus) {
        store.editor.selection = null
      }
      const target = e.target as HTMLDivElement
      if (target.dataset.slateEditor) {
        const top = (target.lastElementChild as HTMLElement)?.offsetTop
        if (store.container && store.container.scrollTop + e.clientY - 60 > top) {
          if (EditorUtils.checkEnd(editor)) {
            e.preventDefault()
          }
        }
      }
    },
    [note]
  )

  useEffect(() => {
    window.electron.ipcRenderer.on('save-doc', save)
    return () => {
      window.electron.ipcRenderer.removeListener('save-doc', save)
    }
  }, [])

  const drop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (core.tree.dragNode) {
        const node = core.tree.dragNode
        if (!node.folder) {
          const type = mediaType(node.filePath)
          if (node.ext === 'md' || type === 'other') {
            Transforms.insertNodes(store.editor, {
              text: node.filename,
              url: toUnixPath(relative(join(note.filePath, '..'), node.filePath))
            })
          } else {
            EditorUtils.focus(store.editor)
            const path = EditorUtils.findMediaInsertPath(store.editor)
            if (path) {
              Transforms.insertNodes(
                store.editor,
                {
                  type: 'media',
                  url: toUnixPath(relative(join(note.filePath, '..'), node.filePath)),
                  children: [{ text: '' }]
                },
                { at: path, select: true }
              )
            }
          }
        }
        return
      }
      if (e.dataTransfer?.files?.length > 0) {
        store.insertMultipleFiles(Array.from(e.dataTransfer.files))
      }
    },
    [note]
  )

  const focus = useCallback(() => {
    store.setState((state) => (state.focus = true))
    store.hideRanges()
  }, [])

  const blur = useCallback(() => {
    store.setState((state) => {
      state.focus = false
      state.tableCellNode = null
      state.refreshTableAttr = !state.refreshTableAttr
      setTimeout(
        action(() => {
          store.openLangCompletion = false
        }),
        30
      )
    })
  }, [])

  const paste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!Range.isCollapsed(store.editor.selection!)) {
        Transforms.delete(store.editor, { at: store.editor.selection! })
      }
      const text = window.api.getClipboardText()
      if (text) {
        try {
          if (text.startsWith('bluestone://')) {
            const url = new URL(text)
            if (core.tree.root?.cid === url.searchParams.get('space')) {
              store.insertLink(url.searchParams.get('path')!)
              e.preventDefault()
              return
            }
          }
          if (text.startsWith('media://') || text.startsWith('attach://')) {
            const path = EditorUtils.findMediaInsertPath(store.editor)
            let insert = false
            const urlObject = new URL(text)
            let url = urlObject.searchParams.get('url')
            if (
              url &&
              !url.startsWith('http') &&
              core.tree.root &&
              url.startsWith(core.tree.root.filePath)
            ) {
              url = toUnixPath(relative(join(core.tree.openedNote!.filePath, '..'), url))
            }
            if (path) {
              if (text.startsWith('media://')) {
                insert = true
                Transforms.insertNodes(
                  store.editor,
                  {
                    type: 'media',
                    height: urlObject.searchParams.get('height') ? +urlObject.searchParams.get('height')! : undefined,
                    url: url || undefined,
                    children: [{ text: '' }]
                  },
                  { select: true, at: path }
                )
              }
              if (text.startsWith('attach://')) {
                insert = true
                  Transforms.insertNodes(
                    store.editor,
                    {
                      type: 'attach',
                      name: urlObject.searchParams.get('name'),
                      size: Number(urlObject.searchParams.get('size') || 0),
                      url: url || undefined,
                      children: [{ text: '' }]
                    },
                    { select: true, at: path }
                  )
              }
              if (insert) {
                e.preventDefault()
                const next = Editor.next(store.editor, { at: path })
                if (next && next[0].type === 'paragraph' && !Node.string(next[0])) {
                  Transforms.delete(store.editor, { at: next[1] })
                }
              }
            }
          }
          if (text.startsWith('http') || (isAbsolute(text) && existsSync(text))) {
            e.preventDefault()
            e.stopPropagation()
            if (['image', 'video', 'audio'].includes(mediaType(text))) {
              if (text.startsWith('http')) {
                const path = EditorUtils.findMediaInsertPath(store.editor)
                if (!path) return
                Transforms.insertNodes(
                  store.editor,
                  {
                    type: 'media',
                    url: text,
                    children: [{ text: '' }]
                  },
                  { select: true, at: path }
                )
              } else {
                store.insertFiles([text])
              }
            } else {
              store.insertLink(text)
            }
          }
        } catch (e) {
          console.log('paste text error', text, e)
        }
      }
      const files = e.clipboardData?.files
      if (files?.length > 0) {
        store.insertMultipleFiles(Array.from(files))
        return
      }
      if (text) {
        const [node] = Editor.nodes<Element>(editor, {
          match: (n) => Element.isElement(n) && n.type === 'code'
        })
        if (node) {
          Transforms.insertFragment(
            editor,
            text.split(/\r?\n/).map((c) => {
              return { type: 'code-line', children: [{ text: c.replace(/\t/g, core.config.tab) }] }
            })
          )
          e.stopPropagation()
          e.preventDefault()
          return
        }
      }
      let paste = e.clipboardData.getData('text/html')
      if (paste) {
        const parsed = new DOMParser().parseFromString(paste, 'text/html').body
        const inner = !!parsed.querySelector('[data-be]')
        if (inner) {
          const md = htmlToMarkdown(paste)
          if (md) {
            core.keyboard.insertMarkdown(md)
          }
          e.stopPropagation()
          e.preventDefault()
        }
      }
    },
    [note]
  )

  const compositionStart = useCallback((e: React.CompositionEvent) => {
    store.inputComposition = true
    runInAction(() => (store.pauseCodeHighlight = true))
    if (editor.selection && Range.isCollapsed(editor.selection)) {
      e.preventDefault()
    }
  }, [])

  const compositionEnd = useCallback((e: React.CompositionEvent) => {
    store.inputComposition = false
    if (store.pauseCodeHighlight) runInAction(() => (store.pauseCodeHighlight = false))
  }, [])

  const onError = useCallback((e: React.SyntheticEvent) => {
    if (import.meta.env.DEV) {
      console.warn('Editor exception', e)
    }
  }, [])

  return (
    <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
      <Slate editor={editor} initialValue={[EditorUtils.p]} onChange={change}>
        <SetNodeToDecorations />
        <Title node={note} />
        <Editable
          onError={onError}
          decorate={high}
          onDragOver={(e) => e.preventDefault()}
          spellCheck={core.config.state.spellCheck}
          readOnly={store.readonly}
          className={`edit-area font-${core.config.state.editorFont} ${
            store.focus ? 'focus' : ''
          }`}
          style={{
            fontSize: core.config.state.editorTextSize || 16
          }}
          onMouseDown={checkEnd}
          onDrop={drop}
          onFocus={focus}
          onBlur={blur}
          onPaste={paste}
          onCompositionStart={compositionStart}
          onCompositionEnd={compositionEnd}
          renderElement={renderElement}
          onKeyDown={keydown}
          renderLeaf={renderLeaf}
        />
      </Slate>
    </ErrorBoundary>
  )
})
