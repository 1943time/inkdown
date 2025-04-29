import { AiMessageList } from './ChatList'
import { useStore } from '@/store/store'
import { ChatInput } from './ChatInput/ChatInput'
import { observer } from 'mobx-react-lite'
import { useCallback } from 'react'
import { SwitchModel } from './SwitchModel'
import { History, Plus, X } from 'lucide-react'
export const Chat = observer(() => {
  const store = useStore()
  const chat = store.chat.state.activeChat
  // const messages = useMemo(() => {
  //   return Array.from(new Array(100)).map((_, index) => {
  //     return {
  //       id: nanoid(),
  //       created: 0,
  //       chatId: '1',
  //       tokens: 0,
  //       role: 'assistant',
  //       reasoning: '',
  //       duration: 0,
  //       height: generateRandomNumber(100, 1000),
  //       content: `# Hello ${index}`,
  //       updated: Date.now()
  //     } as IMessage
  //   })
  // }, [])
  // console.log('messages', messages);
  const move = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    document.body.classList.add('drag-sidebar')
    const startWidth = store.settings.state.chatWidth
    const move = (e: MouseEvent) => {
      let width = startWidth + startX - e.clientX
      if (width > 600) {
        width = 600
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
  if (!store.settings.state.showChatBot) return null
  return (
    <div
      className={`border-l min-w-[380px] dark:border-white/10 ${store.settings.state.showChatBot ? '' : 'invisible opacity-0 w-0 h-0 absolute left-0 top-0 pointer-events-none'}`}
      style={{
        width: store.settings.state.chatWidth
      }}
    >
      <div className={'chat'}>
        <div className={'h-10 relative z-10 drag-nav shadow-xs shadow-black/20'}>
          <div className={'flex justify-between items-center h-full'}>
            <SwitchModel />
            <div className={'drag-none pr-2 flex items-center space-x-2'}>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.settings.setState((state) => {
                    state.showChatBot = false
                  })
                }}
              >
                <Plus size={19} />
              </div>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.settings.setState((state) => {
                    state.showChatBot = false
                  })
                }}
              >
                <History size={16} />
              </div>
              <div
                className={'nav-action'}
                onClick={() => {
                  store.settings.setState((state) => {
                    state.showChatBot = false
                  })
                }}
              >
                <X size={17} />
              </div>
            </div>
          </div>
        </div>
        <div className={'flex-1 flex-shrink-0 min-h-0 overflow-y-auto'}>
          {!chat ? null : <AiMessageList messages={chat?.messages || []} chat={chat!} />}
        </div>
        <div className={'relative flex-shrink-0 flex flex-col items-center pb-4 duration-200'}>
          <div className={'flex justify-center flex-1 w-full px-3'}>
            <ChatInput />
          </div>
        </div>
      </div>
      <div
        className={'fixed w-1 h-screen top-0 z-10 cursor-col-resize'}
        style={{
          right: store.settings.state.chatWidth - 2
        }}
        onMouseDown={move}
      />
    </div>
  )
})
