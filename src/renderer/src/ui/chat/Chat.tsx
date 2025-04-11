import { AiMessageList } from './ChatList'
import { useStore } from '@/store/store'
import { ChatInput } from './ChatInput/ChatInput'
export function Chat() {
  const store = useStore()
  const chat = store.chat.useState((state) => state.activeChat)
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

  return (
    <div className={'flex flex-col h-full'}>
      <div className={'flex-1 flex-shrink-0 min-h-0'}>
        {!chat ? null : (
          <AiMessageList
            messages={chat?.messages || []}
            chat={chat!}
          />
        )}
      </div>
      <div className={'relative flex-shrink-0 flex flex-col items-center pb-4 duration-200'}>
        <div className={'flex justify-center flex-1 w-full px-3'}>
          <ChatInput />
        </div>
        <div className={'text-xs dark:text-white/50 mt-4'}>大模型的回答未必正确无误，请仔细核查</div>
      </div>
    </div>
  )
}
