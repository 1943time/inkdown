import { IMessage } from 'types/model'
import { useCallback, useEffect, useRef } from 'react'
import MessageContent from './components/MessageContent'
import { Alert, Tooltip } from '@lobehub/ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BetweenHorizontalEnd, Check, Clipboard, RotateCcw } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { useStore } from '@/store/store'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
dayjs.extend(relativeTime)
export const AiMessage = observer<{ msg: IMessage }>(({ msg }) => {
  const store = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useGetSetState({
    copied: false,
    isEditing: false
  })

  const copy = useCallback(async () => {
    setState({ copied: true })
    window.api.writeToClipboard(msg.content)
    // copyRichTextToClipboard(await markdownToHtml(msg.content))
    setTimeout(() => {
      setState({ copied: false })
    }, 1000)
  }, [msg.content])
  useEffect(() => {
    const dom = ref.current
    if (dom && !!msg.tokens && !msg.height) {
      setTimeout(() => {
        store.model.updateMessage(msg.id, {
          height: dom.offsetHeight
        })
        runInAction(() => {
          msg.height = dom.offsetHeight
        })
      }, 100)
    }
  }, [msg.tokens])
  return (
    <div
      className={'px-4 pt-2 ai-message w-full'}
      data-msg-id={msg.id}
      ref={ref}
      style={{
        containIntrinsicHeight: msg.height,
        contentVisibility: 'auto'
      }}
    >
      <div className={'flex w-full ai-message-content group'}>
        <div className="flex-1 relative w-0">
          {/* <div
            className={
              'test-xs dark:text-white/50 scale-[.8] origin-left absolute -top-5 left-0 duration-200 group-hover:opacity-100 opacity-0'
            }
          >
            {dayjs(msg.updated).format(
              msg.updated > dayjs().startOf('day').valueOf() ? 'HH:mm:ss' : 'MM-DD HH:mm:ss'
            )}
          </div> */}
          {msg.error ? (
            <Alert
              closable={false}
              message={msg.error.code}
              description={msg.error.message}
              showIcon
              type={'error'}
            />
          ) : (
            <MessageContent msg={msg} />
          )}
          {!!msg.terminated && (
            <div className={'dark:text-gray-300 italic text-sm mt-1 text-gray-400'}>
              系统已停止这条回答
            </div>
          )}
          <div className="flex items-center justify-between dark:text-white/50 text-gray-500 text-sm ai-msg-actions h-8 pb-1 mt-1">
            <div className="flex items-center gap-2 relative">
              <div
                className={
                  'flex space-x-0.5 *:cursor-pointer *:w-[30px] *:h-[30px] *:items-center *:justify-center *:rounded-full'
                }
              >
                <div
                  className={'duration-150 dark:hover:bg-white/10 last hover:bg-black/10'}
                  onClick={() => store.chat.regenrate()}
                >
                  <RotateCcw size={14} />
                </div>
                <div
                  className={'duration-150 dark:hover:bg-white/10 flex hover:bg-black/10'}
                  onClick={copy}
                >
                  {state().copied ? <Check size={14} /> : <Clipboard size={14} />}
                </div>
                <Tooltip title={'写入当前文档'} mouseEnterDelay={1}>
                  <div
                    className={'duration-150 dark:hover:bg-white/10 flex hover:bg-black/10'}
                    onClick={() => {
                      store.note.state.currentTab?.keyboard.insertMarkdown(msg.content)
                    }}
                  >
                    <BetweenHorizontalEnd size={14} />
                  </div>
                </Tooltip>
              </div>
            </div>
            <div>
              {msg.model} <span className={'ml-2'}>{dayjs(msg.updated).fromNow()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
