import { useStore } from '@/store/store'
import { IChat } from 'types/model'
import { openMenus } from '@/ui/common/Menu'
import dayjs from 'dayjs'
import { Ellipsis, MessageSquarePlus, Search } from 'lucide-react'
import { useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'

export const Chats = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const { chats, activeChat } = store.chat.state
  const data = useMemo(() => {
    const chatsMap = new Map<string, IChat[]>()
    for (const c of chats) {
      const today = dayjs().startOf('day').valueOf()
      if (c.updated >= today) {
        const formatTime = t('time.today')
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(1, 'day').startOf('day').valueOf()) {
        const formatTime = t('time.yesterday')
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(7, 'day').startOf('day').valueOf()) {
        const formatTime = t('time.last7Days')
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(30, 'day').startOf('day').valueOf()) {
        const formatTime = t('time.last30Days')
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().startOf('year').valueOf()) {
        const formatTime = t('time.monthFormat', { month: dayjs().month() + 1 })
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      } else if (c.updated >= dayjs().subtract(1, 'year').startOf('year').valueOf()) {
        const formatTime = t('time.yearFormat', { year: dayjs().subtract(1, 'year').year() })
        if (chatsMap.has(formatTime)) {
          chatsMap.get(formatTime)!.push(c)
        } else {
          chatsMap.set(formatTime, [c])
        }
      }
    }
    return chatsMap
  }, [chats, store.chat.state.refresh, t])
  return (
    <div className={'flex flex-col h-full'}>
      <div className={'px-2 space-y-1 font-medium text-sm text-white'}>
        <div
          className={'flex items-center rounded-lg px-2 h-8 action-btn'}
          onClick={() => {
            store.chat.setState({ activeChat: null })
          }}
        >
          <MessageSquarePlus className={'w-4 h-4 mr-2'} />
          {t('chat.newChat')}
        </div>
        <div className={'flex items-center rounded-lg px-2 h-8 action-btn'}>
          <Search className={'w-4 h-4 mr-2'} />
          {t('chat.search')}
        </div>
      </div>
      <div className={'space-y-6 mt-4 flex-1 overflow-y-auto overscroll-contain min-h-0 pb-5'}>
        {Array.from(data.entries()).map(([key, item]) => (
          <div className={'px-2'} key={key}>
            <div className={'text-[13px] text-white font-semibold line-clamp-1 mb-2 px-2'}>
              {key}
            </div>
            <div className={'space-y-0.5'}>
              {item.map((c) => (
                <div
                  key={c.id}
                  className={`group text-sm h-8 items-center flex duration-100 rounded-lg px-2 cursor-pointer ${activeChat?.id === c.id ? 'dark:bg-white/15 text-white' : 'action-btn text-gray-300'}`}
                  onClick={() => {
                    store.chat.createChat(c.id)
                  }}
                >
                  <span className={'flex-1 truncate'}>{c.topic || t('chat.newChat')}</span>
                  <div
                    className={
                      'flex-shrink-0 p-0.5 rounded dark:hover:bg-white/5 hidden group-hover:block ml-0.5'
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      openMenus(e, [
                        {
                          text: t('chat.delete'),
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
  )
})
