import React, { useCallback, useEffect, useRef } from 'react'
import { Editable, ReactEditor, Slate } from 'slate-react'
import { Editor, Element, Node, Range, Transforms } from 'slate'
import { MElement, MLeaf } from './elements/index'
import { useHighlight } from './plugins/useHighlight'
import { useKeyboard } from './plugins/useKeyboard'
import { useOnchange } from './plugins/useOnchange'
import { EditorUtils } from './utils/editorUtils'
import { Title } from './tools/Title'
import { useStore } from '@/store/store'
import { IDoc } from 'types/model'
import { ErrorFallback, ErrorBoundary } from '@/ui/error/ErrorBoundary'
import { TabStore } from '@/store/note/tab'
import { observer } from 'mobx-react-lite'
import { useSubject } from '@/hooks/common'
import { htmlToMarkdown } from '@/parser/htmlToMarkdown'

export const MEditor = observer(({ tab }: { tab: TabStore }) => {
  const store = useStore()
  const settings = tab.store.settings.state
  const changedMark = useRef(false)
  const value = useRef<any[]>([EditorUtils.p])
  const high = useHighlight(tab)
  const saveTimer = useRef(0)
  const changeTimer = useRef(0)
  const nodeRef = useRef<IDoc | undefined>(tab.state.doc)
  const renderElement = useCallback(
    (props: any) => <MElement {...props} children={props.children} />,
    []
  )
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children} />, [])
  const keydown = useKeyboard(tab)
  const onChange = useOnchange(tab)
  const first = useRef(true)

  const save = useCallback(async (ipc = false) => {
    clearTimeout(saveTimer.current)
    const node = nodeRef.current
    changedMark.current = false
    if (node?.schema && tab.state.docChanged) {
      store.note.setState((state) => {
        state.nodes[node.id].schema = node.schema
      })
      tab.setState((state) => {
        state.docChanged = false
      })
      const links = Array.from(
        Editor.nodes(tab.editor, {
          at: [],
          match: (n) => n.type === 'wiki-link'
        })
      )
      const docs = links.map(([el]) => {
        const str = Node.string(el)
        const match = EditorUtils.parseWikiLink(str)
        if (match?.docName) {
          return store.note.getWikiDoc(match.docName)
        }
      })
      store.model.updateDoc(
        node.id,
        {
          spaceId: node.spaceId,
          schema: node.schema,
          name: node.name,
          updated: Date.now(),
          links: docs.filter((d) => !!d).map((d) => d.id)
        },
        {
          texts: EditorUtils.getSchemaText(tab.editor),
          chunks: await store.output.getChunks(node.schema)
        }
      )
      if (!ipc) {
        // core.ipc.sendMessage({
        //   type: 'updateDoc',
        //   data: { cid: node.cid, schema: node.schema }
        // })
      }
    }
  }, [])

  const reset = useCallback((data: any[] | null, ipc = false) => {
    // if (data && nodeRef.current) {
    //   store.initializing = true
    //   editor.selection = null
    //   EditorUtils.reset(editor, data, nodeRef.current.history)
    //   store.doRefreshHighlight()
    //   store.docChanged$.next(true)
    //   setTimeout(() => {
    //     save(ipc)
    //     store.initializing = false
    //   }, 60)
    // } else {
    //   save()
    // }
  }, [])
  // useSubject(store.saveDoc$, (data) => {
  //   reset(data)
  // })
  // useSubject(core.ipc.updateDoc$, (data) => {
  //   if (data.cid === nodeRef.current?.cid && data.schema) {
  //     reset(data.schema, true)
  //   }
  // })
  const change = useCallback(
    (v: any[]) => {
      if (first.current) {
        setTimeout(() => {
          first.current = false
        }, 100)
        return
      }
      value.current = v
      onChange(tab.editor.operations?.some((o) => o.type === 'set_selection'))
      if (tab.state.doc) {
        tab.note.docStatus.set(tab.state.doc.id, {
          history: tab.editor.history,
          sel: tab.editor.selection
        })
        tab.setState((state) => {
          const target = state.doc
          if (target) {
            target.schema = v
          }
        })
      }
      if (tab.editor.operations[0]?.type === 'set_selection') {
        try {
          if (tab.state.openInsertCompletion || tab.state.wikilink.open) {
            tab.setState((state) => {
              state.openLangCompletion = false
              state.wikilink.open = false
            })
            tab.range = document.getSelection()?.getRangeAt(0)
          }
        } catch (e) {}
      }
      if (!tab.editor.operations?.every((o) => o.type === 'set_selection')) {
        if (!changedMark.current) {
          changedMark.current = true
        }
        tab.setState((state) => {
          state.docChanged = true
        })
        clearTimeout(changeTimer.current)
        changeTimer.current = window.setTimeout(() => {
          tab.docChanged$.next(null)
        }, 500)
        clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => {
          save()
        }, 3000)
      }
      setTimeout(() => {
        const [node] = Editor.nodes<Element>(tab.editor, {
          match: (n) => Element.isElement(n),
          mode: 'lowest'
        })
        tab.selChange$.next(node?.[1])
      }, 30)
    },
    [tab]
  )

  const initialNote = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (tab.state.doc) {
      nodeRef.current = tab.state.doc
      first.current = true
      if (!tab.state.doc.schema) {
        const doc = await store.model.getDoc(tab.state.doc.id)
        store.note.setState((state) => {
          state.nodes[tab.state.doc.id].schema = doc?.schema
        })
        tab.docChanged$.next(null)
      }
      try {
        tab.editor.selection = null
        EditorUtils.reset(
          tab.editor,
          tab.state.doc.schema?.length ? tab.state.doc.schema : undefined,
          tab.note.docStatus.get(tab.state.doc.id)?.history || true
        )
      } catch (e) {
        EditorUtils.deleteAll(tab.editor)
      }
      return () => {
        save()
      }
    }
  }, [tab.state.doc])

  useEffect(() => {
    save()
    initialNote()
  }, [tab.state.doc])

  useEffect(() => {
    const blur = async () => {
      clearTimeout(saveTimer.current)
      await save()
      tab.selChange$.next(null)
    }
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('blur', blur)
    }
  }, [])

  useSubject(
    tab.externalChange$,
    (changeDocId) => {
      if (changeDocId === tab.state.doc?.id) {
        try {
          first.current = true
          ReactEditor.blur(tab.editor)
          EditorUtils.deleteAll(tab.editor, tab.state.doc?.schema)
        } catch (e) {}
      }
    },
    []
  )

  const checkEnd = useCallback(
    (e: React.MouseEvent) => {
      if (!ReactEditor.isFocused(tab.editor)) {
        tab.editor.selection = null
      }
      const target = e.target as HTMLDivElement
      if (target.dataset.slateEditor) {
        const top = (target.lastElementChild as HTMLElement)?.offsetTop
        if (tab.container && tab.container.scrollTop + e.clientY - 60 > top) {
          if (EditorUtils.checkEnd(tab.editor)) {
            e.preventDefault()
          }
        }
      }
    },
    [tab.editor]
  )

  const drop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer?.files?.length > 0 && tab.state.doc) {
      tab.insertMultipleImages(Array.from(e.dataTransfer.files))
    }
  }, [])

  const focus = useCallback(() => {
    tab.setState({ focus: true })
    tab.hideRanges()
  }, [tab])

  const blur = useCallback((e: React.FocusEvent) => {
    const [node] = Editor.nodes(tab.editor, {
      match: (n) => n.type === 'media'
    })
    if (node) {
      tab.editor.selection = null
      tab.selChange$.next(null)
    }
    tab.setState((state) => {
      state.focus = false
      state.openLangCompletion = false
    })
  }, [])

  const paste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!Range.isCollapsed(tab.editor.selection!)) {
      Transforms.delete(tab.editor, { at: tab.editor.selection! })
    }
    const text = e.clipboardData.getData('text/plain')
    const files = e.clipboardData?.files
    if (files?.length > 0) {
      tab.insertMultipleImages(Array.from(files))
      return
    }
    if (text) {
      const [node] = Editor.nodes<Element>(tab.editor, {
        match: (n) =>
          Element.isElement(n) &&
          (n.type === 'inline-katex' || n.type === 'table-cell' || n.type === 'wiki-link')
      })

      if (node) {
        Transforms.insertText(tab.editor, text.replace(/\r?\n/g, ' '))
        e.stopPropagation()
        e.preventDefault()
        return
      }
    }
    let paste = e.clipboardData.getData('text/html')

    if (paste) {
      const parsed = new DOMParser().parseFromString(paste, 'text/html').body
      const inner = !!parsed.querySelector('[data-be]')
      if (!inner) {
        const md = htmlToMarkdown(paste)
        if (md) {
          tab.keyboard.insertMarkdown(md)
        }
        e.stopPropagation()
        e.preventDefault()
      }
    }
  }, [])

  const compositionStart = useCallback((e: React.CompositionEvent) => {
    tab.setState((state) => {
      state.inputComposition = true
    })
    if (tab.editor.selection && Range.isCollapsed(tab.editor.selection)) {
      e.preventDefault()
    }
  }, [])

  const compositionEnd = useCallback((e: React.CompositionEvent) => {
    tab.setState({ inputComposition: false })
  }, [])
  if (!tab.state.doc) {
    return null
  }
  return (
    <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
      <Slate editor={tab.editor} initialValue={[EditorUtils.p]} onChange={change}>
        <Title tab={tab} />
        <Editable
          decorate={high}
          onDragOver={(e) => e.preventDefault()}
          spellCheck={settings.spellCheck}
          readOnly={tab.state.readonly}
          className={`edit-area ${tab.state.focus ? 'focus' : ''}`}
          style={{
            fontSize: settings.editorFontSize || 16
          }}
          onContextMenu={(e) => e.stopPropagation()}
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
