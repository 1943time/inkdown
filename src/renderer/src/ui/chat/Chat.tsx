import { AiMessageList } from './ChatList'
import { useStore } from '@/store/store'
import { ChatInput } from './ChatInput/ChatInput'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import { SwitchModel } from './SwitchModel'
import { Fullscreen, History, Minimize, Plus, Scan, X } from 'lucide-react'
import { ChatEmpty } from './Empty'
import { ChatSearch } from './Search'
import { os } from '@/utils/common'
import { ChatNotes } from './ChatNotes'
export const Chat = observer(() => {
  const store = useStore()
  const chat = store.chat.state.activeChat
  const move = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    document.body.classList.add('drag-sidebar')
    const startWidth = store.settings.state.chatWidth
    const move = (e: MouseEvent) => {
      let width = startWidth + startX - e.clientX
      if (width > 650) {
        width = 650
      }
      if (width < 380) {
        width = 380
      }
      store.settings.setState({ chatWidth: width })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener(
      'mouseup',
      () => {
        document.body.classList.remove('drag-sidebar')
        store.settings.setSetting('chatWidth', store.settings.state.chatWidth)
        window.removeEventListener('mousemove', move)
      },
      { once: true }
    )
  }, [])
  return (
    <div
      className={`border-l min-w-[380px] dark:border-white/10 border-black/15
        ${store.settings.state.showChatBot ? 'relative' : 'invisible opacity-0 w-0 h-0 absolute left-0 top-0 pointer-events-none'} 
        ${store.settings.state.fullChatBot ? 'flex-1 w-0' : ''}
      `}
      style={{
        width: store.settings.state.fullChatBot ? '' : store.settings.state.chatWidth
      }}
    >
      <div className={'chat'}>
        <div className={'h-10 relative z-10 drag-nav'}>
          <div
            className={`flex pl-1 pr-2 justify-between items-center h-full ${store.settings.state.fullChatBot && os() === 'mac' ? 'pl-20' : ''}`}
          >
            <div className={'flex items-center drag-none flex-1 w-0'}>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.settings.setSetting('fullChatBot', !store.settings.state.fullChatBot)
                }}
              >
                {store.settings.state.fullChatBot ? (
                  <Minimize size={16} />
                ) : (
                  <Fullscreen size={16} />
                )}
              </div>
              <SwitchModel />
            </div>
            <div className={'drag-none flex items-center space-x-1.5'}>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.chat.setState({ activeChat: null })
                }}
              >
                <Plus size={19} />
              </div>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.chat.setState((state) => {
                    state.openSearch = true
                  })
                }}
              >
                <History size={16} />
              </div>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.settings.setSetting('showChatBot', false)
                  store.settings.setSetting('fullChatBot', false)
                }}
              >
                <X size={17} />
              </div>
            </div>
          </div>
        </div>
        <div className={'flex-1 flex-shrink-0 min-h-0'}>
          {!chat ? <ChatEmpty /> : <AiMessageList messages={chat?.messages || []} chat={chat!} />}
        </div>
        <div className={'relative flex-shrink-0 flex flex-col items-center pb-4 duration-200'}>
          <div className={'flex justify-center flex-1 w-full px-3'}>
            <ChatInput />
          </div>
        </div>
        <ChatNotes />
      </div>
      <div
        className={'fixed w-1 h-screen top-0 z-10 cursor-col-resize'}
        style={{
          right: store.settings.state.chatWidth - 2
        }}
        onMouseDown={move}
      />
      <ChatSearch />
    </div>
  )
})
