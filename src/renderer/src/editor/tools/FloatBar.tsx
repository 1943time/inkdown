import {observer} from 'mobx-react-lite'
import {useLocalState} from '../../hooks/useLocalState'
import {useEditorStore} from '../store'
import React, {useCallback, useEffect, useRef} from 'react'
import {treeStore} from '../../store/tree'
import {
  BoldOutlined, CaretDownOutlined, CheckOutlined,
  ClearOutlined, HighlightOutlined,
  ItalicOutlined,
  LinkOutlined,
  StrikethroughOutlined, UnderlineOutlined
} from '@ant-design/icons'
import {BaseRange, Editor, NodeEntry, Range, Text, Transforms} from 'slate'
import {Input} from 'antd'
import {EditorUtils} from '../utils/editorUtils'
import ICode from '../../icons/ICode'

const tools = [
  {type: 'bold', icon: <BoldOutlined/>},
  {type: 'italic', icon: <ItalicOutlined/>},
  {type: 'strikethrough', icon: <StrikethroughOutlined/>},
  {type: 'code', icon: <ICode className={'w-5 h-5'}/>},
  {type: 'url', icon: <LinkOutlined/>}
]

const colors = [
  {color: 'rgba(16,185,129,1)'},
  {color: 'rgba(245,158,11,1)'},
  {color: 'rgba(59,130,246,1)'},
  {color: 'rgba(156,163,175,.8)'},
  {color: 'rgba(99,102, 241,1)'},
  {color: 'rgba(244,63,94,1)'}
]
export const FloatBar = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    open: false,
    left: 0,
    top: 0,
    link: false,
    url: '',
    hoverSelectColor: false,
    openSelectColor: false
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
      left = left - ((state.openSelectColor ? 206 : 250) - store.domRect.width) / 2
      const container = store.container!
      if (left < 4) left = 4
      const barWidth = state.link ? 304 : state.openSelectColor ? 210 : 254
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
    } else {
      setState({openSelectColor: false, hoverSelectColor: false})
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
            className={'text-base dark:text-gray-300 text-gray-500 cursor-default duration-300 hover:text-sky-500 ml-2'}
          />
        </div> :
        <div className={`${state.openSelectColor ? 'w-[206px]' : 'w-[250px]'} h-full space-x-0.5`}>
          {!state.openSelectColor &&
            <div className={'flex items-center space-x-0.5 justify-center h-full'}>
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
              <div
                className={`flex items-center`}
              >
                <div
                  className={`${EditorUtils.isFormatActive(store.editor, 'highColor') ? 'bg-sky-500/80 dark:text-gray-200 text-white' : state.hoverSelectColor ? 'dark:text-gray-200 dark:bg-gray-200/10 bg-gray-200/50 text-gray-600' : 'float-bar-icon'} py-0.5 px-2 rounded-tl rounded-bl`}
                  onMouseEnter={e => e.stopPropagation()}
                  onClick={() => {
                    if (EditorUtils.isFormatActive(store.editor, 'highColor')) {
                      EditorUtils.highColor(store.editor)
                    } else {
                      EditorUtils.highColor(store.editor, localStorage.getItem('high-color') || '#10b981')
                    }
                  }}
                >
                  <HighlightOutlined />
                </div>
                <div
                  className={'h-6 text-xs rounded-tr rounded-br float-bar-icon flex items-center px-0.5'}
                  onMouseEnter={() => setState({hoverSelectColor: true})}
                  onMouseLeave={() => setState({hoverSelectColor: false})}
                  onClick={() => {
                    setState({openSelectColor: true, hoverSelectColor: false})
                    resize()
                  }}
                >
                  <CaretDownOutlined className={'scale-95'}/>
                </div>
              </div>
              <div className={'w-[1px] h-5 dark:bg-gray-200/10 bg-gray-200 flex-shrink-0'}></div>
              <div
                className={'cursor-default py-0.5 px-[6px] dark:hover:text-gray-200 dark:hover:bg-gray-200/5 rounded hover:bg-gray-200/50 hover:text-gray-600'}
                onClick={() => {
                  EditorUtils.clearMarks(store.editor, true)
                  EditorUtils.highColor(store.editor)
                }}
              >
                <ClearOutlined/>
              </div>
            </div>
          }
          {state.openSelectColor &&
            <div className={'flex items-center space-x-2 justify-center h-full'}>
              <div
                className={'w-5 h-5 rounded border dark:border-white/20 dark:hover:border-white/50 border-black/20 hover:border-black/50 flex items-center justify-center dark:text-white/30 dark:hover:text-white/50 text-black/30 hover:text-black/50'}
                onClick={() => {
                  setState({openSelectColor: false})
                  resize()
                  EditorUtils.highColor(store.editor)
                }}
              >
                /
              </div>
              {colors.map(c =>
                <div
                  key={c.color}
                  style={{backgroundColor: c.color}}
                  className={`float-color-icon ${EditorUtils.isFormatActive(store.editor, 'highColor', c.color) ? 'border-white/50' : ''}`}
                  onClick={() => {
                    localStorage.setItem('high-color', c.color)
                    EditorUtils.highColor(store.editor, c.color)
                    setState({openSelectColor: false})
                    resize()
                  }}
                />
              )}
            </div>
          }
        </div>
      }
    </div>
  )
})
