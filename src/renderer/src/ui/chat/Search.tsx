import { observer } from 'mobx-react-lite'
import React, { useCallback, useEffect, useRef } from 'react'
import isHotkey from 'is-hotkey'
import { useStore } from '@/store/store'
import { IChat } from 'types/model'
import { useLocalState } from '@/hooks/useLocalState'
import { ArrowUpDown, Delete, MessageSquareText, X } from 'lucide-react'
import { IEnter } from '@/icons/keyboard/Enter'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ScrollList } from '../common/ScrollList'
import { useTranslation } from 'react-i18next'

dayjs.extend(relativeTime)
const hightText = (text: string, keyword: string) => {
  if (!text || !keyword) return text
  return text.replace(
    new RegExp(keyword, 'gi'),
    (match) => `<span class="text-blue-500 font-medium mx-[1px]">${match}</span>`
  )
}
export const ChatSearch = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const [state, setState] = useLocalState({
    activeIndex: 0,
    filterRecords: [] as IChat[],
    keyword: '',
    refresh: false
  })
  const getFilterRecords = useCallback(() => {
    return store.chat.state.chats.filter((c) => c.topic?.toLowerCase().includes(state.keyword))
  }, [state.keyword, state.refresh])

  const closeModal = useCallback(() => {
    store.chat.setState((state) => {
      state.openSearch = false
    })
  }, [])
  const select = useCallback((chat: IChat) => {
    if (chat.id !== store.chat.state.activeChat?.id) {
      store.chat.createChat(chat.id)
    }
    closeModal()
  }, [])
  useEffect(() => {
    if (store.chat.state.openSearch) {
      setState({
        filterRecords: getFilterRecords()
      })
    }
  }, [store.chat.state.openSearch])
  if (!store.chat.state.openSearch) return null
  return (
    <div className={'z-[1000] fixed inset-0 dark:bg-black/30 bg-black/10'} onClick={closeModal}>
      <div
        className={'mt-20 w-[500px] ink-modal mx-auto relative '}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className={
            'bg-transparent outline-none h-10 w-full px-4 dark:text-gray-200 text-gray-600 dark:placeholder-gray-200/50 placeholder-gray-400'
          }
          placeholder={t('chat.search_recent_chat')}
          autoFocus={true}
          value={state.keyword}
          onChange={(e) => {
            const query = e.target.value.toLowerCase()
            setState({
              keyword: query,
              activeIndex: 0
            })
            setState({
              filterRecords: getFilterRecords()
            })
          }}
        />
        <div className={'absolute right-2 top-0 h-10 flex items-center flex-wrap'}>
          <div
            className={
              'w-[18px] h-[18px] dark:bg-white/15 dark:text-white/60 dark:hover:bg-white/20 text-black/60 rounded-full bg-black/10 flex justify-center items-center hover:bg-black/15 duration-200 cursor-pointer'
            }
            onClick={() => {
              store.chat.setState((state) => {
                state.openSearch = false
              })
            }}
          >
            <X size={12} />
          </div>
        </div>
        <div className={'h-[1px] bg-gray-200 dark:bg-gray-200/20'} />
        <ScrollList
          className={`relative overflow-y-auto p-2 max-h-[300px] ${!!state.filterRecords.length ? '' : 'hidden'} space-y-1`}
          items={state.filterRecords}
          onSelect={select}
          onClose={closeModal}
          renderItem={(r) => {
            return (
              <div
                className={`group px-1 relative cursor-default pr-1 py-1 rounded dark:text-gray-300 text-gray-600 text-sm`}
                key={r.id}
              >
                <div>
                  <MessageSquareText size={16} className={'inline mr-1'} />
                  <span
                    dangerouslySetInnerHTML={{ __html: hightText(r.topic || '', state.keyword) }}
                  />
                </div>
                <div className={'dark:text-white/60 text-xs pl-5'}>
                  {dayjs(r.updated).fromNow()}
                </div>
                <div
                  onClick={async (e) => {
                    e.stopPropagation()
                    await store.chat.deleteChat(r.id)
                    setState({
                      filterRecords: getFilterRecords()
                    })
                  }}
                  className={
                    'group-hover:block hidden absolute right-1 top-[3px] p-1 rounded-sm dark:hover:bg-white/10 hover:bg-black/5 duration-150 cursor-pointer'
                  }
                >
                  <Delete size={14} />
                </div>
              </div>
            )
          }}
        />
        <div className={`px-4 py-2 ${!state.filterRecords.length ? '' : 'hidden'}`}>
          <div className={'text-gray-500 text-center text-sm'}>{t('chat.no_recent_records')}</div>
        </div>
        <div
          className={
            'flex items-center h-8 border-t dark:border-white/5 dark:text-white/60 px-3 text-black/60 border-black/5'
          }
        >
          <ArrowUpDown size={12} />
          <span className={'text-xs ml-1'}>{t('chat.navigation')}</span>
          <IEnter className={'ml-4 text-xs'} />
          <span className={'text-xs ml-1'}>{t('chat.open')}</span>
          <span className={'text-xs ml-4'}>
            <span className={'font-bold'}>esc</span> {t('chat.close')}
          </span>
        </div>
      </div>
    </div>
  )
})
