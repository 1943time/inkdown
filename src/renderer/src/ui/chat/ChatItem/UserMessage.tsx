import { useStore } from '@/store/store'
import { IMessage } from 'types/model'
import { FileTypeIcon, TextArea } from '@lobehub/ui'
import { Button, Dropdown } from 'antd'
import { useTheme } from 'antd-style'
import isHotkey from 'is-hotkey'
import { Check, Copy, File, FileText, Pencil, TableOfContents, Text } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useGetSetState } from 'react-use'
import { getFileName } from '@/utils/string'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { useTranslation } from 'react-i18next'
import { getImageData } from '@/editor/utils'

const fileTypeIconMap = [
  [/\.pdf$/i, 'pdf', '#F54838'],
  [/\.docx$/i, 'doc', '#0078D4'],
  [/\.xls$/i, 'xls', '#10b981'],
  [/\.xls$/i, 'csv', '#10b981'],
  [/\.xlsx$/i, 'xlsx', '#10b981'],
  [/\.md$/i, 'md', '#f59e0b']
] as [RegExp, string, string][]

export const UserMessage = observer<{ msg: IMessage }>(({ msg }) => {
  const { themeMode } = useTheme()
  const store = useStore()
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useGetSetState({
    copied: false,
    inputText: msg.content || '',
    isEditing: false
  })
  const getFileTypeIcon = useCallback(
    (fileName: string) => {
      const fileType = fileTypeIconMap.find(([regex]) => regex.test(fileName))
      return fileType
        ? [fileType[1], fileType[2]]
        : [
            fileName.split('.').pop()?.toLocaleLowerCase() || 'file',
            themeMode === 'dark' ? '#fff' : '#000'
          ]
    },
    [themeMode]
  )

  const startEditing = useCallback(() => {
    setState({ isEditing: true })
    setTimeout(() => {
      const textarea = document.getElementById(`msg-${msg.id}`) as HTMLTextAreaElement
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      }
    }, 30)
  }, [])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(msg.content)
    setState({ copied: true })
    setTimeout(() => {
      setState({ copied: false })
    }, 1000)
  }, [msg.content])

  const update = useCallback(() => {
    if (state().inputText) {
      setState({ isEditing: false })
      const lastUserMsg =
        store.chat.state.activeChat?.messages?.[store.chat.state.activeChat.messages.length - 2]
      store.chat.setState((draft) => {
        if (draft.activeChat) {
          const remove = draft.activeChat.messages!.slice(-2)!
          store.model.deleteMessages(remove.map((m) => m.id))
          draft.activeChat.messages = draft.activeChat!.messages!.slice(0, -2)
        }
      })
      if (lastUserMsg) {
        runInAction(() => {
          lastUserMsg.content = state().inputText
          lastUserMsg.context = undefined
        })
      }
      store.chat.completion(state().inputText, undefined, lastUserMsg)
    }
  }, [state])
  const hotKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isHotkey('enter', e)) {
        e.preventDefault()
        update()
      }
      if (isHotkey('mod+enter', e)) {
        setState({ inputText: state().inputText + '\n' })
      }
      if (isHotkey('escape', e)) {
        setState({ isEditing: false, inputText: msg.content || '' })
      }
    },
    [msg.content]
  )
  useEffect(() => {
    const dom = ref.current
    if (dom && !msg.height) {
      setTimeout(() => {
        store.model.updateMessage(msg.id, {
          height: dom.clientHeight
        })
        runInAction(() => {
          msg.height = dom.clientHeight
        })
      })
    }
  }, [])
  return (
    <div
      className={'py-2 pl-28 pr-4 flex flex-col items-end user-message'}
      ref={ref}
      style={{
        containIntrinsicHeight: msg.height,
        contentVisibility: 'auto'
      }}
    >
      {state().isEditing && (
        <div className={'w-[80%]'}>
          <TextArea
            autoSize={true}
            value={state().inputText}
            id={`msg-${msg.id}`}
            onKeyDown={hotKey}
            onChange={(e) => {
              setState({ inputText: e.target.value })
            }}
            style={{
              borderRadius: '20px',
              fontSize: '16px',
              padding: '10px 20px'
            }}
            resize={false}
          />
          <div className={'flex justify-end mt-2 space-x-2'}>
            <Button
              size={'small'}
              onClick={() => {
                setState({ isEditing: false, inputText: msg.content || '' })
              }}
              type={'text'}
            >
              {t('chat.message.cancel')}
            </Button>
            <Button type={'primary'} size={'small'} onClick={update}>
              {t('chat.message.update')}
            </Button>
          </div>
        </div>
      )}
      {!state().isEditing && (
        <div className={'flex w-full justify-end group'}>
          <div
            className={
              'flex pt-2 mr-2 space-x-1 *:cursor-pointer *:w-8 *:h-8 *:items-center *:justify-center *:rounded-full duration-150 opacity-0 group-hover:opacity-100 dark:text-gray-300 text-black/60'
            }
          >
            <div
              className={'duration-150 dark:hover:bg-white/10 flex hover:bg-black/10'}
              onClick={copy}
            >
              {state().copied ? <Check size={15} /> : <Copy size={15} />}
            </div>
            <div
              className={'duration-150 dark:hover:bg-white/10 last hover:bg-black/10'}
              onClick={startEditing}
            >
              <Pencil size={15} />
            </div>
          </div>
          <div className={'chat-user-message px-4 py-2.5 max-w-[80%]'}>
            <div>{msg.content}</div>
          </div>
        </div>
      )}
      {!!msg.docs?.length && (
        <div className={'mt-1.5 space-x-2 flex justify-end flex-wrap'}>
          {msg.docs.map((f) => {
            return (
              <div
                key={f.docId}
                onClick={() => {
                  store.note.openDocById(f.docId)
                }}
                title={store.note.state.nodes[f.docId]?.name || f.name}
                className={
                  'max-w-[300px] cursor-pointer flex items-center truncate rounded-sm bg-black/10 dark:bg-white/10 text-[13px] px-1.5 py-0.5 mb-0.5'
                }
              >
                <FileText size={15} />
                <span className={'truncate w-full ml-1'}>
                  {store.note.state.nodes[f.docId]?.name || f.name}
                </span>
              </div>
            )
          })}
        </div>
      )}
      {!!msg.context?.length && (
        <Dropdown
          menu={{
            onClick: (e) => {
              store.note.openDocById(e.key)
            },
            items: msg.context.map((c) => {
              return {
                icon: <File size={13} />,
                key: c.id,
                label: c.name
              }
            })
          }}
        >
          <div className={'mt-1.5 space-x-2 flex justify-end flex-wrap'}>
            <div
              className={
                'max-w-[300px] cursor-pointer flex items-center truncate rounded-sm bg-black/10 dark:bg-white/10 text-[13px] px-1.5 py-0.5 mb-0.5'
              }
            >
              <Text size={15} />
              <span className={'truncate w-full ml-1'}>Context</span>
            </div>
          </div>
        </Dropdown>
      )}

      {!!msg.files?.length && (
        <div className={'mt-1.5 space-x-2 flex justify-end flex-wrap'}>
          {msg.files.map((f) => {
            const [type, color] = getFileTypeIcon(f.name)
            return (
              <div
                key={f.id}
                title={f.name}
                className={
                  'max-w-[300px] flex items-center truncate rounded-lg bg-blue-500/20 text-[13px] px-2 py-1.5 mb-0.5'
                }
              >
                <FileTypeIcon size={20} filetype={type} color={color} />
                <span className={'truncate w-full ml-1'}>{getFileName(f.name)}</span>
              </div>
            )
          })}
        </div>
      )}
      {!!msg.images?.length && (
        <div className={'mt-2 space-x-2 flex justify-end flex-wrap'}>
          {msg.images.map((f, i) => {
            return (
              <div
                key={f.id}
                onClick={() => {
                  store.note.openPreviewImageByData(
                    msg.images!.map((i) => ({ path: i.content })),
                    i
                  )
                }}
                className={
                  'w-16 h-16 flex items-center rounded-lg text-[13px] mb-0.5 overflow-hidden cursor-pointer'
                }
              >
                <img
                  src={getImageData(f.content!)}
                  className={'w-full h-full object-cover'}
                  alt=""
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
