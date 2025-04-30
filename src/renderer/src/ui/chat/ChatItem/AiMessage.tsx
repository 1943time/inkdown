import { IMessage } from 'types/model'
import { memo, useCallback, useEffect, useRef } from 'react'
import MessageContent from './components/MessageContent'
import { Alert } from '@lobehub/ui'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
import { Check, Clipboard, RotateCcw, Volume2 } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { copyRichTextToClipboard, copyToClipboard } from '@/utils/clipboard'
import { useStore } from '@/store/store'
import { markdownToHtml } from '@/output/markdownToHtml'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
export const AiMessage = observer<{ msg: IMessage }>(({ msg }) => {
  const store = useStore()
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useGetSetState({
    copied: false,
    isEditing: false
  })

  const copy = useCallback(async () => {
    setState({ copied: true })
    copyToClipboard(msg.content)
    copyRichTextToClipboard(await markdownToHtml(msg.content))
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
        <div className="flex-1 relative">
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
            <div className={'dark:text-gray-300 italic text-sm mt-1'}>系统已停止这条回答</div>
          )}
          <div className="flex items-center justify-between dark:text-white/50 text-sm ai-msg-actions pb-1">
            <div className="flex items-center gap-2 relative">
              <div
                className={
                  'flex space-x-0.5 *:cursor-pointer *:w-8 *:h-8 *:items-center *:justify-center *:rounded-full'
                }
              >
                <div
                  className={'duration-150 dark:hover:bg-white/10 flex'}
                  onClick={() => store.chat.regenrate()}
                >
                  <RotateCcw size={15} />
                </div>
                <div className={'duration-150 dark:hover:bg-white/10 flex'} onClick={copy}>
                  {state().copied ? <Check size={16} /> : <Clipboard size={15} />}
                </div>
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
