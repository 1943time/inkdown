import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { Editable, ReactEditor, Slate } from 'slate-react'
import { Editor, Element, Node, Range, Transforms } from 'slate'
import { MElement, MLeaf } from './elements/index'
import { useHighlight } from './plugins/useHighlight'
import { useKeyboard } from './plugins/useKeyboard'
import { selChange$, useOnchange } from './plugins/useOnchange'
// import { observer } from 'mobx-react-lite'
import { EditorUtils } from './utils/editorUtils'
// import { action, runInAction } from 'mobx'
// import { useSubject } from '../hooks/subscribe.ts'
// import { ErrorBoundary, ErrorFallback } from '../components/ErrorBoundary.tsx'
import { Title } from './tools/Title'
// import { IFileItem } from '../types/index'
// import { useEditorStore } from '../store/editor.ts'
// import { useCoreContext } from '../utils/env.ts'
// import { htmlToMarkdown } from '../store/logic/parserNode.ts'
import { useStore } from '@/store/store'
import { useShallow } from 'zustand/react/shallow'
import { IDoc } from 'types/model'
import { ErrorFallback, ErrorBoundary } from '@/ui/error/ErrorBoundary'
import { TabStore } from '@/store/note/tab'

export const MEditor = memo(({ tab, doc }: { tab: TabStore; doc: IDoc }) => {
  const [fontSize, spellCheck] = tab.store.settings.useState(
    useShallow((state) => [state.editorFontSize, state.spellCheck])
  )
  const [docChanged, openInsertCompletion, openQuickLinkComplete] = tab.useState(
    useShallow((state) => [
      state.docChanged,
      state.openInsertCompletion,
      state.openQuickLinkComplete
    ])
  )
  const readonly = tab.useState((state) => state.readonly)
  const changedMark = useRef(false)
  const value = useRef<any[]>([EditorUtils.p])
  const high = useHighlight(tab)
  const saveTimer = useRef(0)
  const nodeRef = useRef<IDoc | undefined>(doc)
  const renderElement = useCallback(
    (props: any) => <MElement {...props} children={props.children} />,
    []
  )
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children} />, [])
  const keydown = useKeyboard(tab)
  const onChange = useOnchange(tab)
  const first = useRef(true)

  const save = useCallback(
    async (ipc = false) => {
      clearTimeout(saveTimer.current)
      const node = nodeRef.current
      changedMark.current = false
      if (node?.schema && docChanged) {
        tab.note.useState.setState((state) => {
          state.nodes[node.id].schema = node.schema
        })
        tab.useState.setState((state) => {
          state.docChanged = false
        })
        // core.service.updateNode(node, {
        //   schema: node.schema
        // })
        if (!ipc) {
          // core.ipc.sendMessage({
          //   type: 'updateDoc',
          //   data: { cid: node.cid, schema: node.schema }
          // })
        }
      }
    },
    [tab, docChanged]
  )

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
      onChange()
      if (doc) {
        tab.note.docStatus.set(doc.id, {
          history: tab.editor.history,
          sel: tab.editor.selection
        })
        tab.note.useState.setState((state) => {
          const target = state.nodes[doc?.id]
          if (target) {
            target.schema = v
          }
        })
      }
      if (tab.editor.operations[0]?.type === 'set_selection') {
        try {
          if (openInsertCompletion || openQuickLinkComplete) {
            tab.useState.setState((state) => {
              state.openLangCompletion = false
              state.openQuickLinkComplete = false
            })
            tab.range = document.getSelection()?.getRangeAt(0)
          }
        } catch (e) {}
      }
      if (!tab.editor.operations?.every((o) => o.type === 'set_selection')) {
        if (!changedMark.current) {
          changedMark.current = true
        }
        tab.useState.setState((state) => {
          state.docChanged = true
        })
        clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => {
          save()
        }, 3000)
      }
    },
    [tab, doc, openInsertCompletion, openQuickLinkComplete]
  )

  const initialNote = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (doc) {
      nodeRef.current = doc
      first.current = true
      try {
        tab.editor.selection = null
        EditorUtils.reset(
          tab.editor,
          doc.schema?.length ? doc.schema : undefined,
          tab.note.docStatus.get(doc.id)?.history || true
        )
      } catch (e) {
        EditorUtils.deleteAll(tab.editor)
      }
    } else {
      nodeRef.current = undefined
    }
  }, [tab])

  useEffect(() => {
    save()
    initialNote()
    nodeRef.current = doc
  }, [doc?.id])

  useEffect(() => {
    const blur = async () => {
      clearTimeout(saveTimer.current)
      await save()
    }
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('blur', blur)
    }
  }, [])

  // useSubject(
  //   core.tree.externalChange$,
  //   (changeNote) => {
  //     if (changeNote === note) {
  //       try {
  //         first.current = true
  //         ReactEditor.blur(editor)
  //         document.querySelector
  //         EditorUtils.deleteAll(editor, changeNote.schema)
  //       } catch (e) {}
  //     }
  //   },
  //   [note]
  // )

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

  const drop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // if (core.tree.dragNode) {
      //   const node = core.tree.dragNode
      //   setTimeout(() => {
      //     if (!node.folder) {
      //       const [n] = Editor.nodes<any>(store.editor, {
      //         match: (n) => Element.isElement(n),
      //         mode: 'lowest'
      //       })
      //       if (!n || n[0].type === 'head' || n[0].type === 'code') {
      //         return
      //       }
      //       if (editor.selection) {
      //         Transforms.insertNodes(store.editor, {
      //           text: node.name,
      //           docId: node.cid
      //         })
      //       }
      //     }
      //   }, 16)
      //   return
      // }
      // if (e.dataTransfer?.files?.length > 0 && core.tree.openedNote) {
      //   store.insertMultipleImages(Array.from(e.dataTransfer.files))
      // }
    },
    [tab]
  )

  // const focus = useCallback(() => {
  //   runInAction(() => (store.focus = true))
  //   store.hideRanges()
  // }, [tab])

  // const blur = useCallback((e: React.FocusEvent) => {
  //   const [node] = Editor.nodes(store.editor, {
  //     match: (n) => n.type === 'media'
  //   })
  //   if (node) {
  //     editor.selection = null
  //     selChange$.next(null)
  //   }
  //   runInAction(() => {
  //     store.focus = false
  //     store.tableCellNode = null
  //     store.refreshTableAttr = !store.refreshTableAttr
  //     setTimeout(
  //       action(() => {
  //         store.openLangCompletion = false
  //         store.openQuickLinkComplete = false
  //       }),
  //       30
  //     )
  //   })
  // }, [])

  const paste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!Range.isCollapsed(tab.editor.selection!)) {
        Transforms.delete(tab.editor, { at: tab.editor.selection! })
      }
      const text = e.clipboardData.getData('text/plain')
      // if (text.startsWith('media://') || text.startsWith('attach://')) {
      //   const path = EditorUtils.findMediaInsertPath(store.editor)
      //   let insert = false
      //   if (path) {
      //     if (text.startsWith('media://')) {
      //       // const url = new URL(text)
      //       // if (url.searchParams.get('space') === core.tree.root.cid) {
      //       //   insert = true
      //       //   Transforms.insertNodes(
      //       //     store.editor,
      //       //     {
      //       //       type: 'media',
      //       //       height: url.searchParams.get('height')
      //       //         ? +url.searchParams.get('height')!
      //       //         : undefined,
      //       //       id: url.searchParams.get('id') || undefined,
      //       //       url: url.searchParams.get('url') || undefined,
      //       //       size: url.searchParams.get('size') || undefined,
      //       //       children: [{ text: '' }]
      //       //     },
      //       //     { select: true, at: path }
      //       //   )
      //       // }
      //     }
      //     // if (text.startsWith('attach://')) {
      //     //   insert = true
      //     //   const url = new URL(text)
      //     //   if (url.searchParams.get('space') === core.tree.root.cid) {
      //     //     Transforms.insertNodes(
      //     //       store.editor,
      //     //       {
      //     //         type: 'attach',
      //     //         name: url.searchParams.get('name'),
      //     //         size: Number(url.searchParams.get('size') || 0),
      //     //         id: url.searchParams.get('id') || undefined,
      //     //         url: url.searchParams.get('url') || undefined,
      //     //         children: [{ text: '' }]
      //     //       },
      //     //       { select: true, at: path }
      //     //     )
      //     //   }
      //     // }
      //     // if (insert) {
      //     //   e.preventDefault()
      //     //   const next = Editor.next(store.editor, { at: path })
      //     //   if (next && next[0].type === 'paragraph' && !Node.string(next[0])) {
      //     //     Transforms.delete(store.editor, { at: next[1] })
      //     //   }
      //     // }
      //   }
      // }
      const files = e.clipboardData?.files
      if (files?.length > 0) {
        // store.insertMultipleImages(Array.from(files))
        return
      }
      if (text) {
        const [node] = Editor.nodes<Element>(tab.editor, {
          match: (n) =>
            Element.isElement(n) && (n.type === 'inline-katex' || n.type === 'table-cell')
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
        // if (!inner) {
        //   const md = htmlToMarkdown(paste)
        //   if (md) {
        //     core.keyboard.insertMarkdown(md)
        //   }
        //   e.stopPropagation()
        //   e.preventDefault()
        // }
      }
    },
    [tab]
  )

  // const compositionStart = useCallback((e: React.CompositionEvent) => {
  //   store.inputComposition = true
  //   if (editor.selection && Range.isCollapsed(editor.selection)) {
  //     e.preventDefault()
  //   }
  // }, [])

  // const compositionEnd = useCallback((e: React.CompositionEvent) => {
  //   store.inputComposition = false
  // }, [])
  if (!doc) {
    return null
  }
  return (
    <ErrorBoundary fallback={(e) => <ErrorFallback error={e} />}>
      <Slate editor={tab.editor} initialValue={[EditorUtils.p]} onChange={change}>
        <Title tab={tab} doc={doc} />
        <Editable
          decorate={high}
          onDragOver={(e) => e.preventDefault()}
          spellCheck={spellCheck === 'true'}
          readOnly={readonly}
          className={`edit-area`}
          style={{
            fontSize: +fontSize || 16
          }}
          onContextMenu={(e) => e.stopPropagation()}
          onMouseDown={checkEnd}
          onDrop={drop}
          // onFocus={focus}
          // onBlur={blur}
          onPaste={paste}
          // onCompositionStart={compositionStart}
          // onCompositionEnd={compositionEnd}
          renderElement={renderElement}
          onKeyDown={keydown}
          renderLeaf={renderLeaf}
        />
      </Slate>
    </ErrorBoundary>
  )
})
