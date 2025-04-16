import { IMessage } from 'types/model'
import { memo, useCallback } from 'react'
import MessageContent from './components/MessageContent'
import { Alert } from '@lobehub/ui'
import dayjs from 'dayjs'
import { Check, Clipboard, RotateCcw, Volume2 } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { copyRichTextToClipboard, copyToClipboard } from '@/utils/clipboard'
import { useStore } from '@/store/store'
import { markdownToHtml } from '@/output/markdownToHtml'
import { observer } from 'mobx-react-lite'
export const AiMessage = observer<{ msg: IMessage }>(({ msg }) => {
  const store = useStore()
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
  return (
    <div className={'p-4 ai-message w-full'}>
      <div className={'flex w-full ai-message-content group'}>
        <div
          className={
            'relative w-8 h-8 text-xl flex justify-center items-center bg-blue-500 flex-shrink-0 rounded-full mr-3'
          }
        >
          😎
          {/* <img
               src={}
               className={'w-full h-full object-cover'}
             /> */}
        </div>
        <div className="flex-1 relative">
          <div
            className={
              'test-xs dark:text-white/50 scale-[.8] origin-left absolute -top-5 left-0 duration-200 group-hover:opacity-100 opacity-0'
            }
          >
            {dayjs(msg.updated).format(
              msg.updated > dayjs().startOf('day').valueOf() ? 'HH:mm:ss' : 'MM-DD HH:mm:ss'
            )}
          </div>
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
          <div className="flex items-center justify-between dark:text-gray-400 text-sm ai-msg-actions pb-1 mt-1">
            <div className="flex items-center gap-2 relative -left-2">
              <div
                className={
                  'flex space-x-0.5 *:cursor-pointer *:w-8 *:h-8 *:items-center *:justify-center *:rounded-full'
                }
              >
                <div
                  className={'duration-150 dark:hover:bg-white/10 last-ai-message-action'}
                  onClick={() => store.chat.regenrate()}
                >
                  <RotateCcw size={16} />
                </div>
                <div className={'duration-150 dark:hover:bg-white/10 flex'} onClick={copy}>
                  {state().copied ? <Check size={16} /> : <Clipboard size={16} />}
                </div>
                <div
                  className={'duration-150 dark:hover:bg-white/10 flex'}
                  onClick={() => {
                    window.speechSynthesis.speak(
                      new SpeechSynthesisUtterance('你好啊，我是来自Inkdown的机器人助手，你是谁')
                    )
                  }}
                >
                  <Volume2 size={17} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
