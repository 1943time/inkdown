import { observer } from 'mobx-react-lite'
import { useLocalState } from '../../hooks/useLocalState'
import { useEditorStore } from '../store'
import { useCallback, useEffect, useRef } from 'react'
import {
  BoldOutlined,
  CaretDownOutlined, ClearOutlined,
  FontColorsOutlined,
  ItalicOutlined,
  LinkOutlined,
  StrikethroughOutlined
} from '@ant-design/icons'
import { BaseRange, Editor, NodeEntry, Range, Text, Transforms } from 'slate'
import { Tooltip } from 'antd'
import { EditorUtils } from '../utils/editorUtils'
import ICode from '../../icons/ICode'
import { IFileItem } from '../../index'
import { isMac } from '../../utils'
import { useSubject } from '../../hooks/subscribe'
import { getSelRect } from '../utils/dom'
import Command from '../../icons/keyboard/Command'
import Ctrl from '../../icons/keyboard/Ctrl'
import Shift from '../../icons/keyboard/Shift'
import Option from '../../icons/keyboard/Option'
import { runInAction } from 'mobx'
import { useCoreContext } from '../../store/core'
const FloatBarWidth = 246
function Mod() {
  if (isMac) {
    return <Command className={'w-3 h-3'} />
  } else {
    return <Ctrl className={'w-3 h-3'} />
  }
}
const tools = [
  {
    type: 'bold',
    icon: <BoldOutlined />,
    tooltip: (
      <div className={'text-xs flex items-center space-x-1'}>
        <Mod />
        <span>B</span>
      </div>
    )
  },
  {
    type: 'italic',
    icon: <ItalicOutlined />,
    tooltip: (
      <div className={'text-xs flex items-center space-x-1'}>
        <Mod />
        <span>I</span>
      </div>
    )
  },
  {
    type: 'strikethrough',
    icon: <StrikethroughOutlined />,
    tooltip: (
      <div className={'text-xs flex items-center space-x-1'}>
        <Mod />
        <Shift />
        <span>S</span>
      </div>
    )
  },
  {
    type: 'code',
    icon: <ICode className={'text-base ml-[1px]'} />,
    tooltip: (
      <div className={'text-xs flex items-center space-x-0.5'}>
        <Option />
        <span>`</span>
      </div>
    )
  }
]

const colors = [
  { color: 'rgba(16,185,129,1)' },
  { color: 'rgba(245,158,11,1)' },
  { color: 'rgba(59,130,246,1)' },
  { color: 'rgba(156,163,175,.8)' },
  { color: 'rgba(99,102, 241,1)' },
  { color: 'rgba(244,63,94,1)' },
  { color: 'rgba(217,70,239,1)' },
  { color: 'rgba(14, 165, 233, 1)' }
]
const fileMap = new Map<string, IFileItem>()
export const FloatBar = observer(() => {
  const core = useCoreContext()
  const store = useEditorStore()
  const inputRef = useRef<any>()
  const [state, setState] = useLocalState({
    open: false,
    left: 0,
    top: 0,
    url: '',
    hoverSelectColor: false,
    openSelectColor: false
  })

  const sel = useRef<BaseRange>()
  const el = useRef<NodeEntry<any>>()

  const openLink = useCallback(() => {
    const sel = store.editor.selection!
    el.current = Editor.parent(store.editor, sel.focus.path)
    store.highlightCache.set(el.current[0], [{ ...sel, highlight: true }])
    store.openInsertLink$.next(sel)
    runInAction(() => {
      store.refreshHighlight = !store.refreshHighlight
      store.openLinkPanel = true
    })
  }, [])

  useSubject(store.floatBar$, (type) => {
    if (type === 'link') {
      const [text] = Editor.nodes(store.editor, {
        match: Text.isText
      })
      if (text && text[0].url) {
        Transforms.select(store.editor, text[1])
      }
      setTimeout(() => {
        store.setState((store) => (store.domRect = getSelRect()))
        resize(true)
        openLink()
        setTimeout(() => {
          inputRef.current?.focus()
        }, 16)
      })
    } else if (type === 'highlight') {
      if (!Range.isCollapsed(store.editor.selection!)) {
        setState({ openSelectColor: true, hoverSelectColor: false })
        resize(true)
      }
    }
  })
  useEffect(() => {}, [store.refreshFloatBar])

  const resize = useCallback((force = false) => {
    if (store.domRect && !store.openLinkPanel) {
      let left = store.domRect.x
      if (!core.tree.fold) left -= core.tree.width
      left = left - ((state.openSelectColor ? 260 : FloatBarWidth) - store.domRect.width) / 2
      const container = store.container!
      if (left < 4) left = 4
      const barWidth = state.openSelectColor ? 264 : FloatBarWidth + 4
      if (left > container.clientWidth - barWidth) left = container.clientWidth - barWidth
      let top = state.open && !force ? state.top : container.scrollTop + store.domRect.top - 80
      if (core.tree.tabs.length > 1) top -= 30
      setState({
        open: true,
        left,
        top
      })
    }
  }, [])

  useEffect(() => {
    if (store.domRect) {
      resize(true)
      sel.current = store.editor.selection!
    } else {
      setState({ open: false })
      fileMap.clear()
    }
  }, [store.domRect, store.openSearch])

  useEffect(() => {
    if (state.open) {
      const close = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !store.openLinkPanel) {
          e.preventDefault()
          setState({ open: false })
          fileMap.clear()
          const end = Range.end(sel.current!).path
          if (Editor.hasPath(store.editor, end)) {
            Transforms.select(store.editor, Editor.end(store.editor, end))
          }
        }
      }
      window.addEventListener('keydown', close)
      return () => window.removeEventListener('keydown', close)
    } else {
      setState({ openSelectColor: false, hoverSelectColor: false })
    }
    return () => {}
  }, [state.open])

  useEffect(() => {
    const change = () => {
      if (state.open) {
        const rect = getSelRect()
        if (rect) {
          store.setState((state) => (state.domRect = rect))
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
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      className={`${
        state.open ? 'duration-100' : 'hidden'
      } float-bar rounded overflow-hidden ctx-panel
      `}
    >
      <div
        style={{
          width: state.openSelectColor ? 260 : FloatBarWidth
        }}
        className={`h-full overflow-hidden`}
      >
        {!state.openSelectColor && (
          <div className={'flex *:h-full *:flex *:items-center justify-center h-full'}>
            <div className={`flex *:h-full *:flex *:items-center`}>
              <div
                className={`${
                  EditorUtils.isFormatActive(store.editor, 'highColor')
                    ? 'text-blue-500'
                    : 'dark:text-gray-200 text-gray-600'
                } py-0.5 px-2  ${
                  state.hoverSelectColor ? 'dark:bg-gray-100/10 bg-gray-200/50' : ''
                } dark:hover:bg-gray-100/10 hover:bg-gray-200/50 cursor-pointer`}
                onMouseEnter={(e) => e.stopPropagation()}
                onClick={() => {
                  if (EditorUtils.isFormatActive(store.editor, 'highColor')) {
                    EditorUtils.highColor(store.editor)
                  } else {
                    EditorUtils.highColor(
                      store.editor,
                      localStorage.getItem('high-color') || '#10b981'
                    )
                  }
                }}
              >
                <FontColorsOutlined />
              </div>
              <div
                className={
                  'h-6 text-xs px-0.5 dark:hover:bg-gray-100/10 hover:bg-gray-200/50 cursor-pointer'
                }
                onMouseEnter={() => setState({ hoverSelectColor: true })}
                onMouseLeave={() => setState({ hoverSelectColor: false })}
                onClick={() => {
                  setState({ openSelectColor: true, hoverSelectColor: false })
                  resize()
                }}
              >
                <CaretDownOutlined className={'scale-95'} />
              </div>
            </div>
            {tools.map((t) => (
              <Tooltip title={t.tooltip} key={t.type} mouseEnterDelay={0.3}>
                <div
                  key={t.type}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    EditorUtils.toggleFormat(store.editor, t.type)
                  }}
                  className={`${
                    EditorUtils.isFormatActive(store.editor, t.type)
                      ? 'text-blue-500 '
                      : 'dark:hover:text-gray-200 hover:text-gray-600'
                  }
              cursor-pointer py-0.5 ${t.type !== 'code' ? 'px-2' : 'px-1.5'} dark:hover:bg-gray-100/10 hover:bg-gray-200/50
              `}
                >
                  {t.icon}
                </div>
              </Tooltip>
            ))}
            <div className={'h-full w-[1px] dark:bg-gray-200/10 bg-gray-200 flex-shrink-0'} />
            <div
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                openLink()
              }}
              className={`${
                EditorUtils.isFormatActive(store.editor, 'url')
                  ? 'text-blue-500 '
                  : 'dark:hover:text-gray-200 hover:text-gray-600'
              }
              cursor-pointer py-0.5 px-1.5 dark:hover:bg-gray-100/10 hover:bg-gray-200/50
              `}
            >
              <LinkOutlined />
              <span className={'ml-1 text-[13px]'}>Link</span>
            </div>
            <div className={'h-full w-[1px] dark:bg-gray-200/10 bg-gray-200 flex-shrink-0'} />
            <Tooltip
              mouseEnterDelay={0.3}
              title={
                <div className={'text-xs flex items-center space-x-1'}>
                  <Mod />
                  <span>\</span>
                </div>
              }
            >
              <div
                className={
                  'cursor-pointer px-2 dark:hover:text-gray-200 dark:hover:bg-gray-200/5 hover:bg-gray-200/50 hover:text-gray-600'
                }
                onClick={() => {
                  EditorUtils.clearMarks(store.editor, true)
                  EditorUtils.highColor(store.editor)
                }}
              >
                <ClearOutlined />
              </div>
            </Tooltip>
          </div>
        )}
        {state.openSelectColor && (
          <div className={'flex items-center space-x-2 justify-center h-full'}>
            <div
              className={
                'w-5 h-5 rounded border cursor-pointer dark:border-white/20 dark:hover:border-white/50 border-black/20 hover:border-black/50 flex items-center justify-center dark:text-white/30 dark:hover:text-white/50 text-black/30 hover:text-black/50'
              }
              onClick={() => {
                EditorUtils.highColor(store.editor)
                setState({ openSelectColor: false })
                resize()
              }}
            >
              /
            </div>
            {colors.map((c) => (
              <div
                key={c.color}
                style={{ backgroundColor: c.color }}
                className={`float-color-icon flex-shrink-0 duration-200`}
                onClick={() => {
                  localStorage.setItem('high-color', c.color)
                  EditorUtils.highColor(store.editor, c.color)
                  setState({ openSelectColor: false })
                  resize()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
