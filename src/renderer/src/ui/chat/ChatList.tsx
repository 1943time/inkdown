import { IChat, IMessage } from 'types/model'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { useGetSetState } from 'react-use'
import ChatItem from './ChatItem'
import { ChevronDown } from 'lucide-react'
import { observer } from 'mobx-react-lite'

export const AiMessageList = observer<{ messages: IMessage[]; chat: IChat }>(
  ({ messages, chat }) => {
    const virtuosoRef = useRef<VirtuosoHandle>(null)
    const scrollTimer = useRef(0)
    const preChatId = useRef(chat?.id)
    const [state, setState] = useGetSetState({
      atBottom: false,
      isScrolling: false,
      followOutput: false,
      visible: true,
      showScrollToBottom: false
    })

    const scrollToChat = useCallback(
      (behavior: 'auto' | 'smooth' = 'auto') => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: messages.length - 2,
            align: 'start',
            behavior: behavior
          })
        }
      },
      [messages.length]
    )
    const scrollToBottom = useCallback(
      (behavior: 'auto' | 'smooth' = 'auto') => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: 'LAST',
            align: 'end',
            behavior: behavior,
            offset: 100
          })
        }
      },
      [messages.length]
    )
    const scrollTop = useCallback((behavior: 'auto' | 'smooth' = 'auto') => {
      if (virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: 0,
          align: 'start',
          behavior: behavior
        })
      }
    }, [])

    const render = useCallback((index: number, msg: IMessage) => {
      return <ChatItem msg={msg} />
    }, [])

    useLayoutEffect(() => {
      if (preChatId.current !== chat?.id) {
        setState({ visible: false, showScrollToBottom: false })
        preChatId.current = chat?.id
        setTimeout(() => {
          setState({ visible: true })
        }, 30)
      }
    }, [chat?.id])
    useEffect(() => {
      if (state().visible) {
        setTimeout(() => {
          scrollToChat('smooth')
        }, 30)
      }
    }, [messages.length])

    return (
      <div className={'relative'}>
        <div
          className={`chat-list ${state().visible ? 'animate-show' : 'hidden'} ${chat?.pending ? 'pending' : ''}`}
        >
          <div className={'w-full'}>
            {messages.map((m) => (
              <ChatItem key={m.id} msg={m} />
            ))}
          </div>
        </div>
        {/* <Virtuoso
          atBottomThreshold={50}
          style={{ height: '100%', fontSize: 16, opacity: state().visible ? 1 : 0 }}
          className={`chat-list ${state().visible ? 'animate-show' : ''} ${chat?.pending ? 'pending' : ''}`}
          computeItemKey={(_, item) => item.id}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement
            const clientHeight = target.children[0]?.children[0]?.clientHeight || 0
            setState({
              showScrollToBottom:
                clientHeight > window.innerHeight &&
                target.scrollTop < clientHeight - target.clientHeight - 500
            })
          }}
          components={{
            Footer: () => <div style={{ height: 30 }}></div>
          }}
          data={messages}
          totalListHeightChanged={(height) => {
            clearTimeout(scrollTimer.current)
            if (!state().visible) {
              scrollTimer.current = window.setTimeout(() => {
                scrollTop()
                setState({ showScrollToBottom: height > window.innerHeight + 500, visible: true })
              }, 100)
            }
          }}
          followOutput={false}
          increaseViewportBy={window.innerHeight * 3}
          initialTopMostItemIndex={messages.length - 1}
          itemContent={render}
          overscan={window.innerHeight * 3}
          ref={virtuosoRef}
        /> */}
        {state().showScrollToBottom && (
          <div
            onClick={() => {
              scrollToBottom('smooth')
            }}
            className={`absolute left-1/2 -translate-x-1/2 p-1 bg-[var(--primary-bg-color)] z-10 bottom-3 rounded-full border dark:border-white/10 opacity-0 ${state().showScrollToBottom ? 'animate-show cursor-pointer' : 'pointer-events-none'}`}
          >
            <ChevronDown size={16} />
          </div>
        )}
      </div>
    )
  }
)
