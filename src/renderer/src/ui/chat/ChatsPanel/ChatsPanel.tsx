import { useStore } from '@/store/store'
import { IChat } from 'types/model'
import { openMenus } from '@/ui/common/Menu'
import dayjs from 'dayjs'
import { Ellipsis, MessageSquarePlus, Search } from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

export function ChatsPanel() {
  const store = useStore()
  const sidePanelWidth = store.settings.useState((state) => state.sidePanelWidth)
  const [chats, activeChat] = store.chat.useState(
    useShallow((state) => [state.chats, state.activeChat])
  )
  const data = useMemo(() => {
    const chatsMap = new Map<string, IChat[]>()
    for (const c of chats) {
      const today = dayjs().startOf('day').valueOf()
      if (c.updated >= today) {
        const formatTime = '今日'
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(1, 'day').startOf('day').valueOf()) {
        const formatTime = '昨日'
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(7, 'day').startOf('day').valueOf()) {
        const formatTime = '前7天'
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(30, 'day').startOf('day').valueOf()) {
        const formatTime = '前30天'
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().startOf('year').valueOf()) {
        const formatTime = `${dayjs().month() + 1}月`
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(1, 'year').startOf('year').valueOf()) {
        const formatTime = `${dayjs().subtract(1, 'year').year()}年`
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      }
    }
    return chatsMap
  }, [chats])

  const move = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    document.body.classList.add('select-none')
    const get = store.settings.useState.getState
    const startWidth = get().sidePanelWidth
    const move = (e: MouseEvent) => {
      let width = startWidth + e.clientX - startX
      if (width > 500) {
        width = 500
      }
      if (width < 200) {
        width = 200
      }
      store.settings.useState.setState({ sidePanelWidth: width })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener(
      'mouseup',
      () => {
        document.body.classList.remove('select-none')
        store.model.putSetting({ key: 'sidePanelWidth', value: get().sidePanelWidth })
        window.removeEventListener('mousemove', move)
      },
      { once: true }
    )
  }, [])
  return (
    <div
      className={'border-r dark:border-white/10 h-full bg-[var(--side-panel-bg-color)] pt-10'}
      style={{ width: sidePanelWidth }}
    >
      <div
        className={'fixed w-1 h-screen top-0 z-10 cursor-col-resize'}
        style={{
          left: sidePanelWidth - 2
        }}
        onMouseDown={move}
      />
      <div className={'flex flex-col h-full'}>
        <div className={'px-3 space-y-1 font-medium text-sm text-white'}>
          <div
            className={
              'flex items-center rounded-lg px-3 h-8 cursor-pointer hover:dark:bg-white/5 duration-200'
            }
            onClick={() => {
              store.chat.useState.setState({ activeChat: null })
            }}
          >
            <MessageSquarePlus className={'w-4 h-4 mr-2'} />
            New Chat
          </div>
          <div
            className={
              'flex items-center rounded-lg px-3 h-8 cursor-pointer hover:dark:bg-white/5 duration-200'
            }
          >
            <Search className={'w-4 h-4 mr-2'} />
            Search
          </div>
        </div>
        <div
          className={'space-y-6 mt-4 flex-1 overflow-y-auto overscroll-contain min-h-0 pb-5 px-1'}
        >
          {Array.from(data.entries()).map(([key, item]) => (
            <div className={'px-3'} key={key}>
              <div className={'text-[13px] text-white font-semibold line-clamp-1 mb-2 px-2'}>
                {key}
              </div>
              <div className={'space-y-0.5'}>
                {item.map((c) => (
                  <div
                    key={c.id}
                    className={`group text-sm h-8 items-center flex duration-100 rounded-lg px-2 cursor-pointer ${activeChat?.id === c.id ? 'dark:bg-white/15 text-white' : 'dark:hover:bg-white/10 text-gray-300/90'}`}
                    onClick={() => {
                      store.chat.createChat(c.id)
                    }}
                  >
                    <span className={'flex-1 truncate'}>{c.topic || 'New Chat'}</span>
                    <div
                      className={
                        'flex-shrink-0 p-0.5 rounded dark:hover:bg-white/5 hidden group-hover:block ml-0.5'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        openMenus(e, [
                          {
                            text: 'Delete',
                            click: () => {
                              store.chat.deleteChat(c.id)
                            }
                          }
                        ])
                      }}
                    >
                      <Ellipsis className={'w-4 h-4'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
