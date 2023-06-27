import {observer} from 'mobx-react-lite'
import {useLocalState} from '../../hooks/useLocalState'
import {useEditorStore} from '../store'
import React, {useCallback, useEffect, useRef} from 'react'
import {treeStore} from '../../store/tree'
import {
  BoldOutlined, CheckOutlined,
  ClearOutlined,
  FileSearchOutlined,
  ItalicOutlined,
  LinkOutlined,
  StrikethroughOutlined
} from '@ant-design/icons'
import ICode from '../../assets/ReactIcon/ICode'
import {BaseRange, Editor, NodeEntry, Path, Range, Text, Transforms} from 'slate'
import {Input} from 'antd'
import {EditorUtils} from '../utils/editorUtils'

const tools = [
  {type: 'bold', icon: <BoldOutlined/>},
  {type: 'italic', icon: <ItalicOutlined/>},
  {type: 'strikethrough', icon: <StrikethroughOutlined/>},
  {type: 'code', icon: <ICode className={'w-5 h-5'}/>},
  {type: 'url', icon: <LinkOutlined/>}
]
export const FloatBar = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    open: false,
    left: 0,
    top: 0,
    link: false,
    url: ''
  })
  const sel = useRef<BaseRange>()
  const el = useRef<NodeEntry<any>>()
  const closeLink = useCallback(() => {
    window.removeEventListener('mousedown', closeLink)
    setState({link: false, open: false})
    store.highlightCache.delete(el.current?.[0])
    store.setState(state => state.refreshHighlight = !state.refreshHighlight)
  }, [])

  const openLink = useCallback(() => {
    const sel = store.editor.selection!
    const maxLeft = store.container!.clientWidth - 304
    if (state.left > maxLeft) {
      setState({left: maxLeft})
    }
    el.current = Editor.parent(store.editor, sel.focus.path)
    store.highlightCache.set(el.current[0], [{...sel, highlight: true}])
    store.setState(state => state.refreshHighlight = !state.refreshHighlight)
    setState({link: true, url: EditorUtils.getUrl(store.editor)})
    window.addEventListener('mousedown', closeLink)
  }, [])

  useEffect(() => {}, [store.refreshFloatBar])

  const resize = useCallback((force = false) => {
    if (store.domRect) {
      let left = store.domRect.x
      if (!treeStore.fold) left -= treeStore.width
      left = left - (200 - store.domRect.width) / 2
      const container = store.container!
      if (left < 4) left = 4
      const barWidth = state.link ? 304 : 204
      if (left > container.clientWidth - barWidth) left = container.clientWidth - barWidth
      const top = state.open && !force ? state.top : container.scrollTop + store.domRect.top - 80
      setState({
        open: true,
        left, top
      })
    }
  }, [])

  useEffect(() => {
    if (state.link && store.domRect) return
    if (store.domRect) {
      resize(true)
      sel.current = store.editor.selection!
    } else {
      setState({open: false})
    }
  }, [store.domRect])
  useEffect(() => {
    if (state.open) {
      const close = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          setState({open: false})
          Transforms.select(store.editor, Range.end(sel.current!))
        }
      }
      window.addEventListener('keydown', close)
      return () => window.removeEventListener('keydown', close)
    }
    return () => {}
  }, [state.open])

  useEffect(() => {
    const change = () => {
      if (state.open) {
        const domSelection = window.getSelection()
        const domRange = domSelection?.getRangeAt(0)
        const rect = domRange?.getBoundingClientRect()
        if (rect) {
          store.setState(state => state.domRect = rect)
        }
        resize(true)
      }
    }
    window.addEventListener('resize', change)
    return () => window.removeEventListener('resize', change)
  }, [])
  return (
    <div
      style={{
        left: state.left,
        top: state.top
      }}
      onMouseDown={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
      className={`absolute ${state.open ? state.link ? '' : 'duration-100' : 'hidden'} select-none
        z-10 dark:text-gray-300 h-8 rounded text-sm dark:bg-zinc-800 bg-white text-gray-500  border dark:border-gray-200/10 border-gray-200
      `}
    >
      {state.link ?
        <div className={'flex items-center h-full w-[300px] px-2'}>
          <Input
            size={'small'} placeholder={'url or filepath'}
            value={state.url}
            bordered={false}
            autoFocus={true}
            allowClear={true}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                Transforms.setNodes(
                  store.editor,
                  {url: state.url || undefined},
                  {match: Text.isText, split: true}
                )
                closeLink()
              }
            }}
            onChange={e => setState({url: e.target.value})}
            onMouseDown={e => {
              e.stopPropagation()
            }}
          />
          <div className={'w-[1px] h-5 bg-gray-200/10 flex-shrink-0'}></div>
          <CheckOutlined
            onClick={() => {
              Transforms.setNodes(
                store.editor,
                {url: state.url || undefined},
                {match: Text.isText, split: true}
              )
              closeLink()
            }}
            className={'text-base dark:text-gray-300 text-gray-500 cursor-default duration-300 hover:text-sky-500'}
          />
        </div> :
        <div className={'w-[200px] justify-center items-center h-full flex space-x-0.5'}>
          {tools.map(t =>
            <div
              key={t.type}
              onMouseDown={e => e.preventDefault()}
              onClick={(e) => {
                if (t.type !== 'url') {
                  EditorUtils.toggleFormat(store.editor, t.type)
                } else {
                  openLink()
                }
              }}
              className={`${EditorUtils.isFormatActive(store.editor, t.type) ? 'bg-sky-500/80 dark:text-gray-200 text-white' : 'dark:hover:text-gray-200 dark:hover:bg-gray-200/10 hover:bg-gray-200/50 hover:text-gray-600'}
              cursor-default py-0.5 px-2 rounded
              `}
            >
              {t.icon}
            </div>
          )}
          <div className={'w-[1px] h-5 bg-gray-200/10 flex-shrink-0'}></div>
          <div
            className={'cursor-default py-0.5 px-[6px] dark:hover:text-gray-200 dark:hover:bg-gray-200/5 rounded hover:bg-gray-200/50 hover:text-gray-600'}
            onClick={() => {
              EditorUtils.clearMarks(store.editor, true)
            }}
          >
            <ClearOutlined/>
          </div>
        </div>
      }
    </div>
  )
})
