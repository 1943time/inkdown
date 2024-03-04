import React, {useCallback, useEffect, useRef} from 'react'
import {Editable, ReactEditor, Slate} from 'slate-react'
import {Editor, Element, Range, Transforms} from 'slate'
import {MElement, MLeaf} from './elements'
import {clearAllCodeCache, SetNodeToDecorations, useHighlight} from './plugins/useHighlight'
import {useKeyboard} from './plugins/useKeyboard'
import {useOnchange} from './plugins/useOnchange'
import {htmlParser} from './plugins/htmlParser'
import {observer} from 'mobx-react-lite'
import {IFileItem} from '../index'
import {treeStore} from '../store/tree'
import {EditorUtils} from './utils/editorUtils'
import {useEditorStore} from './store'
import {action, runInAction} from 'mobx'
import {useSubject} from '../hooks/subscribe'
import {configStore} from '../store/config'
import {countWords} from 'alfaaz'
import {debounceTime, Subject} from 'rxjs'
import {ipcRenderer} from 'electron'
import {toMarkdown} from './output/md'
import {isAbsolute} from 'path'
import {stat} from '../utils'
import {existsSync} from 'fs'
import {ErrorBoundary, ErrorFallback} from '../components/ErrorBoundary'
import {Title} from './tools/Title'
import {updateNode} from './utils/updateNode'

const countThrottle$ = new Subject<any>()
export const MEditor = observer(({note}: {
  note: IFileItem
}) => {
  const store = useEditorStore()
  const changedMark = useRef(false)
  const editor = store.editor
  const value = useRef<any[]>([EditorUtils.p])
  const high = useHighlight(store)
  const saveTimer = useRef(0)
  const changedTimer = useRef(0)
  const nodeRef = useRef<IFileItem>()
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const keydown = useKeyboard(store)
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
      updateNode(node)
    }
  }, [note])

  useSubject(store.saveDoc$, data => {
    if (data && nodeRef.current) {
      editor.selection = null
      EditorUtils.reset(editor, data, nodeRef.current.history)
      store.doRefreshHighlight()
      requestIdleCallback(() => {
        save()
      })
    } else {
      save()
    }
  })
  const count = useCallback(async (nodes: any[]) => {
    if (!configStore.config.showCharactersCount || !nodeRef.current) return
    const res = await toMarkdown(nodes)
    const texts = Editor.nodes(editor, {
      at: [],
      match: n => n.text
    })
    runInAction(() => {
      store.count.words = Array.from<any>(texts).reduce((a, b) => a + countWords(b[0].text), 0)
      store.count.characters = res.length
    })
  }, [editor])

  useSubject(countThrottle$.pipe<any>(debounceTime(300)), count)

  useEffect(() => {
    if (treeStore.currentTab.store === store) {
      if (note) count(note.schema || [])
    }
  }, [treeStore.currentTab, note])
  const change = useCallback((v: any[]) => {
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
        runInAction(() => store.openLangCompletion = false)
        treeStore.currentTab.range = document.getSelection()?.getRangeAt(0)
      } catch (e) {
      }
    }
    if (editor.operations.length !== 1 || editor.operations[0].type !== 'set_selection') {
      if (!changedMark.current) {
        changedMark.current = true
        ipcRenderer.send('file-changed')
      }
      countThrottle$.next(v)
      runInAction(() => {
        note.refresh = !note.refresh
        store.docChanged = true
      })
      clearTimeout(saveTimer.current)
      clearTimeout(changedTimer.current)
      saveTimer.current = window.setTimeout(() => {
        save()
      }, 3000)
    }
  }, [note])

  const initialNote = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (note && ['md', 'markdown'].includes(note.ext || '')) {
      nodeRef.current = note
      store.setState(state => state.pauseCodeHighlight = true)
      first.current = true
      count(note.schema || [])
      try {
        EditorUtils.reset(editor, note.schema?.length ? note.schema : undefined, note.history || true)
        clearAllCodeCache(editor)
      } catch (e) {
        EditorUtils.deleteAll(editor)
      }
      requestIdleCallback(() => {
        store.setState(state => state.pauseCodeHighlight = false)
        requestIdleCallback(() => {
          store.setState(state => state.refreshHighlight = !state.refreshHighlight)
        })
      })
    } else {
      nodeRef.current = undefined
    }
  }, [note])

  useEffect(() => {
    save()
    if (note === treeStore.openedNote && nodeRef.current !== note) {
      initialNote()
    }
  }, [note, editor, treeStore.openedNote])

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

  useSubject(treeStore.externalChange$, path => {
    if (path === note?.filePath) {
      try {
        first.current = true
        ReactEditor.blur(editor)
        EditorUtils.deleteAll(editor, note.schema)
      } catch (e) {
      }
    }
  }, [note])

  const checkEnd = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLDivElement
    if (target.dataset.slateEditor) {
      const top = (target.lastElementChild as HTMLElement)?.offsetTop
      if (store.container && store.container.scrollTop + e.clientY - 60 > top) {
        if (EditorUtils.checkEnd(editor)) {
          e.preventDefault()
        }
      }
    }
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.on('save-doc', save)
    return () => {
      window.electron.ipcRenderer.removeListener('save-doc', save)
    }
  }, [])

  const drop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.files?.length) return
    if (e.dataTransfer?.files?.length > 1) {
      store.insertMultipleFiles(e.dataTransfer.files)
    } else {
      const file = e.dataTransfer.files[0]
      if (file) {
        setTimeout(() => {
          store.insertFile(file)
        }, 100)
      }
    }
    return false
  }, [])

  const focus = useCallback(() => {
    store.setState(state => state.focus = true)
    store.hideRanges()
  }, [])

  const blur = useCallback(() => {
    store.setState(state => {
      state.focus = false
      state.tableCellNode = null
      state.refreshTableAttr = !state.refreshTableAttr
      setTimeout(action(() => {
        store.openLangCompletion = false
      }), 30)
    })
  }, [])

  const paste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!Range.isCollapsed(store.editor.selection!)) {
      Transforms.delete(store.editor, {at: store.editor.selection!})
    }
    const text = window.api.getClipboardText()
    if (text) {
      try {
        if (text.startsWith('http') || (isAbsolute(text) && existsSync(text))) {
          e.preventDefault()
          e.stopPropagation()
          store.insertLink(text)
        }
      } catch (e) {
        console.log('paste text error', text, e)
      }
    }
    const files = e.clipboardData?.files
    if (files?.length > 1) {
      store.insertMultipleFiles(files)
    } else if (files?.length === 1) {
      const file = files[0]
      if (file.path && stat(file.path)?.isDirectory()) return
      store.insertFile(file)
      return
    }
    if (text) {
      const [node] = Editor.nodes<Element>(editor, {
        match: n => Element.isElement(n) && n.type === 'code'
      })
      if (node) {
        Transforms.insertFragment(editor, text.split('\n').map(c => {
          return {type: 'code-line', children: [{text: c.replace(/\t/g, configStore.tab)}]}
        }))
        e.stopPropagation()
        e.preventDefault()
        return
      }
    }
    let paste = e.clipboardData.getData('text/html')
    if (paste && htmlParser(editor, paste)) {
      e.stopPropagation()
      e.preventDefault()
    }
  }, [])

  const compositionStart = useCallback((e: React.CompositionEvent) => {
    store.inputComposition = true
    runInAction(() => store.pauseCodeHighlight = true)
    if (editor.selection && Range.isCollapsed(editor.selection)) {
      e.preventDefault()
    }
  }, [])

  const compositionEnd = useCallback((e: React.CompositionEvent) => {
    store.inputComposition = false
    if (store.pauseCodeHighlight) runInAction(() => store.pauseCodeHighlight = false)
  }, [])

  const onError = useCallback((e: React.SyntheticEvent) => {
    if (import.meta.env.DEV) {
      console.warn('Editor exception', e)
    }
  }, [])

  return (
    <ErrorBoundary
      fallback={e => <ErrorFallback error={e}/>}
    >
      <Slate
        editor={editor}
        initialValue={[EditorUtils.p]}
        onChange={change}
      >
        <SetNodeToDecorations/>
        <Title node={note}/>
        <Editable
          onError={onError}
          decorate={high}
          spellCheck={configStore.config.spellCheck}
          readOnly={store.readonly}
          className={`edit-area font-${configStore.config.editorFont}`}
          style={{
            fontSize: configStore.config.editorTextSize || 16
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
