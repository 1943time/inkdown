import { IChat, IMessage } from 'types/model'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useGetSetState } from 'react-use'
import ChatItem from './ChatItem'
import { ChevronDown } from 'lucide-react'
import { observer } from 'mobx-react-lite'

export const AiMessageList = observer<{ messages: IMessage[]; chat: IChat }>(
  ({ messages, chat }) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const scrollTimer = useRef(0)
    const preChatId = useRef(chat?.id)
    const [state, setState] = useGetSetState({
      atBottom: false,
      isScrolling: false,
      followOutput: false,
      visible: true,
      showScrollToBottom: true
    })

    const scrollToChat = useCallback(
      (index: number, behavior: 'auto' | 'smooth' = 'auto') => {
        if (scrollRef.current) {
          const target = listRef.current!.children[0]?.children[index - 1]
          if (target) {
            target.scrollIntoView({ behavior, block: 'start' })
          }
        }
      },
      [messages.length]
    )
    const scrollToBottom = useCallback(
      (behavior: 'auto' | 'smooth' = 'auto') => {
        if (scrollRef.current) {
          const last =
            listRef.current!.children[0]?.children[
              listRef.current!.children[0]!.children.length - 1
            ]
          if (last) {
            last.scrollIntoView({ behavior, block: 'end' })
          }
        }
      },
      [messages.length]
    )
    const scroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      clearTimeout(scrollTimer.current)
      scrollTimer.current = window.setTimeout(() => {
        setState({
          showScrollToBottom:
            listRef.current!.scrollHeight > window.innerHeight - 200 &&
            scrollRef.current!.scrollTop + scrollRef.current!.clientHeight <
              listRef.current!.scrollHeight - 300
        })
      }, 100)
    }, [])
    useLayoutEffect(() => {
      if (preChatId.current !== chat?.id) {
        setState({ visible: false, showScrollToBottom: false })
        preChatId.current = chat?.id
        scrollRef.current?.scrollTo({
          top: 0,
          behavior: 'instant'
        })
        setTimeout(() => {
          setState({
            visible: true,
            showScrollToBottom: listRef.current!.scrollHeight > window.innerHeight - 200
          })
        }, 30)
      }
    }, [chat?.id])

    useEffect(() => {
      if (state().visible) {
        setTimeout(() => {
          scrollToChat(messages.length - 1, 'smooth')
        }, 30)
      }
    }, [messages.length])

    return (
      <div className={'relative h-full'}>
        <div
          className={`overflow-y-auto h-full pt-4 pb-10 relative`}
          ref={scrollRef}
          onScroll={scroll}
        >
          <div
            ref={listRef}
            className={`chat-list ${state().visible ? 'animate-show' : 'hidden'} ${chat?.pending ? 'pending' : ''}`}
          >
            <div className={'w-full'}>
              {messages.map((m) => (
                <ChatItem key={m.id} msg={m} />
              ))}
            </div>
          </div>
        </div>
        <div
          onClick={() => {
            scrollToBottom('smooth')
          }}
          className={`absolute left-1/2 -translate-x-1/2 p-0.5 bg-[var(--primary-bg-color)] z-10 bottom-4 rounded-full border dark:border-white/10 border-black/20 opacity-0 ${state().showScrollToBottom ? 'animate-show cursor-pointer' : 'pointer-events-none'}`}
        >
          <ChevronDown size={16} className={'dark:stroke-white/60 stroke-black/60'} />
        </div>
      </div>
    )
  }
)
