import { useCallback, useEffect, useRef } from 'react'
import {
  BoldOutlined,
  CaretDownOutlined,
  ClearOutlined,
  FontColorsOutlined,
  ItalicOutlined,
  LinkOutlined,
  StrikethroughOutlined
} from '@ant-design/icons'
import { BaseRange, Editor, NodeEntry, Range, Transforms } from 'slate'
import { Tooltip } from 'antd'
import { EditorUtils } from '../utils/editorUtils'
import { getSelRect } from '../utils/dom'
import { ArrowBigUp, ChevronUp, Code, Command, Option, Slash } from 'lucide-react'
import { os } from '@/utils/common'
import { useTab } from '@/store/note/TabCtx'
import { useGetSetState } from 'react-use'
import { observer } from 'mobx-react-lite'

function Mod() {
  if (os() === 'mac') {
    return <Command size={12} />
  } else {
    return <ChevronUp size={12} />
  }
}
const tools = [
  {
    type: 'bold',
    icon: <BoldOutlined />,
    tooltip: (
      <div className={'text-sm flex items-center space-x-1'}>
        <Mod />
        <span>B</span>
      </div>
    )
  },
  {
    type: 'italic',
    icon: <ItalicOutlined />,
    tooltip: (
      <div className={'text-sm flex items-center space-x-1'}>
        <Mod />
        <span>I</span>
      </div>
    )
  },
  {
    type: 'strikethrough',
    icon: <StrikethroughOutlined />,
    tooltip: (
      <div className={'text-sm flex items-center space-x-1'}>
        <Mod />
        <Option size={13} />
        <span>S</span>
      </div>
    )
  },
  {
    type: 'code',
    icon: <Code className={'ml-[1px]'} size={16} />,
    tooltip: (
      <div className={'text-sm flex items-center space-x-0.5'}>
        <Option size={13} />
        <span>`</span>
      </div>
    )
  }
]

const colors = [
  { color: 'rgba(16,185,129,1)' },
  { color: 'rgba(245,158,11,1)' },
  { color: 'rgba(59,130,246,1)' },
  { color: 'rgba(156,163,175, 1)' },
  { color: 'rgba(99,102, 241,1)' },
  { color: 'rgba(244,63,94,1)' },
  { color: 'rgba(217,70,239,1)' },
  { color: 'rgba(14, 165, 233, 1)' }
]
const FloatBarWidth = 246
export const FloatBar = observer(() => {
  const tab = useTab()
  const [state, setState] = useGetSetState({
    open: false,
    left: 0,
    top: 0,
    url: '',
    hoverSelectColor: false,
    openSelectColor: false,
    refresh: false
  })
  const refresh = useCallback(() => {
    setState({ refresh: !state().refresh })
  }, [])
  const openLink = useCallback(() => {
    const sel = tab.editor.selection!
    el.current = Editor.parent(tab.editor, sel.focus.path)
    tab.highlightCache.set(el.current[0], [{ ...sel, highlight: true }])
    tab.setState((state) => {
      state.openInsertLink = true
      tab.refreshHighlight()
    })
  }, [tab.editor])
  const sel = useRef<BaseRange>(null)
  const el = useRef<NodeEntry<any>>(null)
  useEffect(() => {
    if (tab.state.showFloatBar) {
      setState({ open: true })
      resize(tab.state.domRect)
    } else {
      setState({ open: false })
    }
  }, [tab.state.showFloatBar])

  const resize = useCallback(
    (domRect: DOMRect | null) => {
      if (!domRect) return
      let left = domRect.x
      const barWidth = state().openSelectColor ? 264 : FloatBarWidth + 4
      if (!tab.store.settings.state.foldSideBar) {
        left -= tab.store.settings.state.sidePanelWidth
      }
      left += domRect.width / 2 - barWidth / 2
      const container = tab.container!
      if (left < 4) left = 4
      if (left > container.clientWidth - barWidth) left = container.clientWidth - barWidth
      let top =
        container.scrollTop + domRect.top - 76 - (tab.store.note.state.tabs.length > 1 ? 34 : 0)
      setState({
        open: true,
        left,
        top
      })
    },
    [tab]
  )
  useEffect(() => {
    setState({
      open: false
    })
  }, [tab.store.note.state.tabs.length])

  useEffect(() => {
    if (tab.state.domRect) {
      resize(tab.state.domRect)
      sel.current = tab.editor.selection!
    } else {
      setState({ open: false })
    }
  }, [tab.state.domRect, tab.store.settings.state.showChatBot])

  useEffect(() => {
    if (state().open) {
      const close = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          setState({ open: false })
          // fileMap.clear()
          const end = Range.end(sel.current!).path
          if (Editor.hasPath(tab.editor, end)) {
            Transforms.select(tab.editor, Editor.end(tab.editor, end))
          }
        }
      }
      window.addEventListener('keydown', close)
      return () => window.removeEventListener('keydown', close)
    } else {
      setState({ openSelectColor: false, hoverSelectColor: false })
    }
    return () => {}
  }, [state().open])

  useEffect(() => {
    const change = () => {
      if (state().open) {
        const rect = getSelRect()
        if (rect) {
          tab.setState({ domRect: rect })
        }
        resize(rect)
      }
    }
    window.addEventListener('resize', change)
    return () => window.removeEventListener('resize', change)
  }, [])

  return (
    <div
      style={{
        left: state().left,
        top: state().top
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      className={`${
        state().open ? 'duration-100' : 'hidden'
      } float-bar rounded overflow-hidden ctx-panel select-none
      `}
    >
      <div
        style={{
          width: state().openSelectColor ? 260 : FloatBarWidth
        }}
        className={`h-full overflow-hidden`}
      >
        {!state().openSelectColor && (
          <div className={'flex *:h-full *:flex *:items-center justify-center h-full'}>
            <div className={`flex *:h-full *:flex *:items-center`}>
              <div
                className={`${
                  EditorUtils.isFormatActive(tab.editor, 'highColor')
                    ? 'text-blue-500'
                    : 'dark:text-gray-200 text-gray-600'
                } py-0.5 px-2  ${
                  state().hoverSelectColor ? 'dark:bg-gray-100/10 bg-gray-200/50' : ''
                } dark:hover:bg-gray-100/10 hover:bg-gray-200/50 cursor-pointer`}
                onMouseEnter={(e) => e.stopPropagation()}
                onClick={() => {
                  if (EditorUtils.isFormatActive(tab.editor, 'highColor')) {
                    EditorUtils.highColor(tab.editor)
                  } else {
                    EditorUtils.highColor(
                      tab.editor,
                      localStorage.getItem('high-color') || '#10b981'
                    )
                  }
                  refresh()
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
                  resize(tab.state.domRect)
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
                    tab.keyboard.toggleFormat(t.type as any)
                    refresh()
                  }}
                  className={`${
                    EditorUtils.isFormatActive(tab.editor, t.type)
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
              className={`cursor-pointer py-0.5 px-1.5 dark:hover:bg-gray-100/10 hover:bg-gray-200/50`}
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
                  tab.keyboard.clearFormat()
                }}
              >
                <ClearOutlined />
              </div>
            </Tooltip>
          </div>
        )}
        {state().openSelectColor && (
          <div className={'flex items-center space-x-2 justify-center h-full'}>
            <div
              className={
                'w-5 h-5 rounded border cursor-pointer dark:border-white/30 dark:hover:border-white/60 border-black/30 hover:border-black/50 flex items-center justify-center dark:text-white/40 dark:hover:text-white/60 text-black/40 hover:text-black/60'
              }
              onClick={() => {
                EditorUtils.highColor(tab.editor)
                setState({ openSelectColor: false })
                // resize()
              }}
            >
              <Slash size={14} />
            </div>
            {colors.map((c) => (
              <div
                key={c.color}
                style={{ backgroundColor: c.color }}
                className={`float-color-icon flex-shrink-0 duration-200`}
                onClick={() => {
                  localStorage.setItem('high-color', c.color)
                  EditorUtils.highColor(tab.editor, c.color)
                  setState({ openSelectColor: false })
                  // resize()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
