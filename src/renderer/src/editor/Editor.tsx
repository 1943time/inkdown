import React, {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editable, Slate} from 'slate-react'
import {Descendant, Editor} from 'slate'
import {MElement, MLeaf} from './elements'
import {SetNodeToDecorations, useHighlight} from './plugins/useHighlight'
import {useKeyboard} from './plugins/useKeyboard'
import {useOnchange} from './plugins/useOnchange'
import './parser'
import {htmlParser} from './plugins/htmlParser'
import {observer} from 'mobx-react-lite'
import {IFileItem} from '../index'
import {treeStore} from '../store/tree'
import {EditorUtils} from './utils/editorUtils'
import {Placeholder} from './tools/Placeholder'
import {toMarkdown} from './output'
import {useEditorStore} from './store'
import {runInAction} from 'mobx'
import {useSubject} from '../hooks/subscribe'
import {configStore} from '../store/config'

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      {text: ''}
    ]
  }
]

export const MEditor = observer(({note}: {
  note: IFileItem
}) => {
  const store = useEditorStore()
  const editor = store.editor
  const value = useRef<any[]>(initialValue)
  const high = useHighlight(store)
  const saveTimer = useRef(0)
  const nodeRef = useRef<IFileItem>()
  const renderElement = useCallback((props: any) => <MElement {...props} children={props.children}/>, [])
  const renderLeaf = useCallback((props: any) => <MLeaf {...props} children={props.children}/>, [])
  const keydown = useKeyboard(editor)
  const onChange = useOnchange(editor, store)
  const first = useRef(true)
  const changed = useRef(false)
  const save = useCallback(async () => {
    if (nodeRef.current && changed.current) {
      changed.current = false
      treeStore.watcher.pause()
      const root = Editor.node(editor, [])
      const schema = treeStore.schemaMap.get(nodeRef.current)
      if (schema?.state) {
        const res = toMarkdown(schema.state, '', [root[0]])
        await window.api.fs.writeFile(nodeRef.current.filePath, res, {encoding: 'utf-8'})
      }
    }
  }, [note])

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
      runInAction(() => {
        note.refresh = !note.refresh
      })
    }
    if (editor.operations.length !== 1 || editor.operations[0].type !== 'set_selection') {
      changed.current = true
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
      first.current = true
      if (!data) data = treeStore.getSchema(note)
      EditorUtils.reset(editor, data?.state.length ? data.state : undefined, data?.history || true)
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

  const inputAndRefresh = useMemo(() => {
    let timer = 0
    return (e: React.FormEvent<HTMLDivElement>) => {
      clearTimeout(timer)
      timer = window.setTimeout(() => {
        // @ts-ignore
        const text = e.nativeEvent?.data || ''
        if (/[\u4e00-\u9fa5]/.test(text)) {
          runInAction(() => {
            store.refreshHighlight = !store.refreshHighlight
          })
        }
      }, 60)
    }
  }, [])
  const checkEnd = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLDivElement
    if (target.dataset.slateEditor) {
      const box = target.parentElement?.parentElement?.parentElement as HTMLDivElement
      const top = (target.lastElementChild as HTMLElement)?.offsetTop
      if (box?.scrollTop + e.clientY > top) {
        if (EditorUtils.checkEnd(editor)) {
          e.preventDefault()
        }
      }
    }
  }, [])
  return (
    <Slate
      editor={editor}
      initialValue={initialValue}
      onChange={change}
    >
      <SetNodeToDecorations/>
      <Placeholder/>
      <Editable
        decorate={high}
        spellCheck={false}
        className={'pt-14 edit-area'}
        style={{fontSize: configStore.config.editorTextSize}}
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
        onBeforeInputCapture={inputAndRefresh}
        renderElement={renderElement}
        onKeyDown={keydown}
        renderLeaf={renderLeaf}
      />
    </Slate>
  )
})
