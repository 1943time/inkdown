import React, {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editable, Slate} from 'slate-react'
import {Editor} from 'slate'
import {MElement, MLeaf} from './elements'
import {codeCache, SetNodeToDecorations, useHighlight} from './plugins/useHighlight'
import {useKeyboard} from './plugins/useKeyboard'
import {useOnchange} from './plugins/useOnchange'
import {htmlParser} from './plugins/htmlParser'
import {observer} from 'mobx-react-lite'
import {IFileItem} from '../index'
import {treeStore} from '../store/tree'
import {EditorUtils} from './utils/editorUtils'
import {Placeholder} from './tools/Placeholder'
import {toMarkdown} from './output'
import {useEditorStore} from './store'
import {action, runInAction} from 'mobx'
import {useSubject} from '../hooks/subscribe'
import {configStore} from '../store/config'
import {countWords} from 'alfaaz'
import {debounceTime, Subject} from 'rxjs'
import {saveRecord} from '../store/db'
const countThrottle$ = new Subject<any>()
export const saveDoc$ = new Subject<any[] | null>()
const preventDefault = (e: React.CompositionEvent) => e.preventDefault()

export const MEditor = observer(({note}: {
  note: IFileItem
}) => {
  const store = useEditorStore()
  const inCode = useRef(false)
  const editor = store.editor
  const value = useRef<any[]>([EditorUtils.p])
  const high = useHighlight(store)
  const saveTimer = useRef(0)
  const nodeRef = useRef<IFileItem>()
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const keydown = useKeyboard(editor)
  const onChange = useOnchange(editor, store)
  const first = useRef(true)
  const save = useCallback(async () => {
    if (nodeRef.current && store.docChanged) {
      runInAction(() => {
        store.docChanged = false
      })
      const root = Editor.node(editor, [])
      const schema = treeStore.schemaMap.get(nodeRef.current)
      if (schema?.state) {
        const res = toMarkdown(schema.state, '', [root[0]])
        saveRecord(nodeRef.current.filePath, schema.state)
        await window.api.fs.writeFile(nodeRef.current.filePath, res, {encoding: 'utf-8'})
      }
    }
  }, [note])

  useSubject(saveDoc$, data => {
    if (data && nodeRef.current) {
      const schema = treeStore.schemaMap.get(nodeRef.current)
      EditorUtils.reset(editor, data, schema?.history)
      store.doRefreshHighlight()
    } else {
      save()
    }
  })
  const count = useCallback((nodes: any[]) => {
    if (!configStore.config.showCharactersCount) return
    const root = Editor.node(editor, [])
    const res = toMarkdown(nodes, '', root[0].children || [])
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

  const change = useCallback((v: any[]) => {
    if (first.current) {
      setTimeout(() => {
        first.current = false
      }, 100)
      return
    }
    value.current = v
    onChange(v)
    if (note) {
      treeStore.schemaMap.set(note, {
        state: v,
        history: editor.history
      })
    }
    if (editor.operations.length !== 1 || editor.operations[0].type !== 'set_selection') {
      countThrottle$.next(v)
      runInAction(() => {
        note.refresh = !note.refresh
        store.docChanged = true
      })
      clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        save()
      }, 3000)
    }
  }, [note])

  useEffect(() => {
    clearTimeout(saveTimer.current)
    save()
    if (note && ['md', 'markdown'].includes(note.ext || '')) {
      nodeRef.current = note
      store.setState(state => state.pauseCodeHighlight = true)
      let data = treeStore.schemaMap.get(note)
      setTimeout(() => {
        count(data?.state || [])
      })
      first.current = true
      if (!data) data = treeStore.getSchema(note)
      EditorUtils.reset(editor, data?.state.length ? data.state : undefined, data?.history || true)
      treeStore.schemaMap.set(note, {
        ...data!,
      })
      setTimeout(() => {
        store.setState(state => state.pauseCodeHighlight = false)
        requestIdleCallback(() => {
          store.setState(state => state.refreshHighlight = !state.refreshHighlight)
        })
      }, 100)
    } else {
      nodeRef.current = undefined
    }
  }, [note, editor])

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
      first.current = true
      EditorUtils.reset(editor, treeStore.schemaMap.get(note)!.state)
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
  useEffect(() => {
    const [node] = Editor.nodes(store.editor, {
      match: n => n.type === 'code',
      mode: 'highest'
    })
    inCode.current = !!node
  }, [store.sel])
  return (
    <Slate
      editor={editor}
      initialValue={[EditorUtils.p]}
      onChange={change}
    >
      <SetNodeToDecorations/>
      <Placeholder/>
      <Editable
        decorate={high}
        spellCheck={configStore.config.spellCheck}
        readOnly={store.readonly}
        className={`edit-area ${configStore.config.headingMarkLine ? 'heading-line' : ''}`}
        style={{fontSize: configStore.config.editorTextSize || 16}}
        onMouseDown={checkEnd}
        onDrop={e => {
          const dragNode = treeStore.dragNode
          const file = e.dataTransfer.files[0]
          if ((dragNode && !dragNode.folder) || file) {
            setTimeout(() => {
              if (dragNode) {
                store.insertDragFile(dragNode)
              } else {
                store.insertFile(file)
              }
            }, 100)
          }
          return false
        }}
        onFocus={() => {
          store.setState(state => state.focus = true)
          store.hideRanges()
        }}
        onBlur={() => {
          store.setState(state => {
            state.focus = false
            state.tableCellNode = null
            state.refreshTableAttr = !state.refreshTableAttr
          })
        }}
        onPaste={e => {
          const text = window.api.getClipboardText()
          if (text && text.startsWith('bsc::')) {
            const [, path] = text.split('::')
            e.preventDefault()
            e.stopPropagation()
            store.insertInlineNode(path)
          }
          const file = e.clipboardData?.files[0]
          if (file) {
            store.insertFile(file)
            return
          }
          let paste = e.clipboardData.getData('text/html')
          if (paste && htmlParser(editor, paste)) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        onCompositionStart={preventDefault}
        onCompositionEnd={e => {
          const [code] = Editor.nodes<any>(store.editor, {
            match: el => el.type === 'code'
          })
          if (code) {
            codeCache.delete(code[0])
            requestIdleCallback(action(() => store.refreshHighlight = !store.refreshHighlight))
          }
        }}
        renderElement={renderElement}
        onKeyDown={keydown}
        renderLeaf={renderLeaf}
      />
    </Slate>
  )
})
