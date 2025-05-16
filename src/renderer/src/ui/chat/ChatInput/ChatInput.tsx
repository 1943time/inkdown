import { useStore } from '@/store/store'
import { Tooltip } from '@lobehub/ui'
import { Modal, Popover } from 'antd'
import isHotkey from 'is-hotkey'
import {
  CircleX,
  Earth,
  FileText,
  Image,
  Paperclip,
  Plus,
  SendHorizontal,
  SquareLibrary,
  X
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Editor, Element, Node, Range, Transforms } from 'slate'
import { Editable, RenderElementProps, RenderLeafProps, Slate } from 'slate-react'
import { IMessageDoc, IMessageFile } from 'types/model'
import { chooseFile } from './ChooseFile'
import { ILoad } from '@/icons/ILoad'
import { copyToClipboard } from '@/utils/clipboard'
import { IStop } from '@/icons/IStop'
import { getFileExtension } from '@/utils/string'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { observer } from 'mobx-react-lite'
import { useLocalState } from '@/hooks/useLocalState'
import { getDomRect } from '@/utils/dom'
import { useTranslation } from 'react-i18next'

export const ChatInput = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const { activeChat, webSearch } = store.chat.state

  const ableWebSearch = useMemo(() => {
    return (activeChat && activeChat?.websearch) || (!activeChat && webSearch)
  }, [activeChat, webSearch])
  const editor = useMemo(() => store.chat.editor, [])
  const [state, setState] = useLocalState({
    inputComposition: false,
    height: 24,
    text: '',
    menuVisible: false,
    files: [] as IMessageFile[],
    images: [] as IMessageFile[],
    docs: [] as IMessageDoc[]
  })
  const drop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])
  const compositionStart = useCallback(
    (e: React.CompositionEvent<HTMLDivElement>) => {
      setState((state) => (state.inputComposition = true))
      if (editor.selection && Range.isCollapsed(editor.selection)) {
        e.preventDefault()
      }
    },
    [editor]
  )
  const compositionEnd = useCallback((e: React.CompositionEvent<HTMLDivElement>) => {
    setState((state) => (state.inputComposition = false))
  }, [])
  const send = useCallback(() => {
    if (!store.settings.state.defaultModel?.model) {
      store.note.openConfirmDialog$.next({
        title: t('chat.input.tip'),
        description: t('chat.input.noModel'),
        okText: t('chat.input.goToSettings'),
        okType: 'primary',
        onConfirm: () => {
          store.settings.setData((state) => {
            state.open = true
            state.setTab = 2
          })
        }
      })
      return
    }
    if (activeChat?.pending) {
      store.chat.stopCompletion(activeChat.id)
      return
    }
    if (!state.text || state.files.find((f) => f.status === 'pending')) return
    store.chat.completion(state.text, {
      files: state.files,
      images: state.images
    })
    EditorUtils.reset(editor)
    setState({ text: '', files: [], images: [] })
  }, [editor, state.text, activeChat?.pending])

  const keydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation()
      if (isHotkey('mod+backspace', e)) {
        const [p] = Editor.nodes(editor, {
          match: (n) => Element.isElement(n) && n.type === 'paragraph'
        })
        if (p) {
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, p[1]),
              focus: Editor.end(editor, p[1])
            }
          })
          e.preventDefault()
        }
        return
      }
      if (isHotkey('enter', e)) {
        e.preventDefault()
        if (!store.chat.state.reference.open) {
          send()
        }
      }
      if (isHotkey('shift+enter', e) || isHotkey('mod+enter', e)) {
        e.preventDefault()
        Transforms.insertNodes(editor, {
          type: 'paragraph',
          children: [{ text: '' }]
        })
      }
      if (isHotkey('backspace', e)) {
        const str = Editor.string(editor, [])
        if (!str) {
          if (editor.children.length > 1 && editor.selection?.anchor.path[0] === 0) {
            Transforms.delete(editor, {
              at: [0]
            })
          } else if (editor.children.length === 1 && store.chat.state.cacheDocs.length) {
            store.chat.setState((state) => {
              state.cacheDocs.pop()
            })
          }
        }
      }
      if (e.key === '@') {
        setTimeout(() => {
          const domRect = getDomRect()
          if (domRect) {
            store.chat.setState((state) => {
              state.reference.open = true
              state.reference.domRect = domRect
            })
          }
        }, 16)
      } else if (store.chat.state.reference.open) {
        setTimeout(() => {
          const [node] = Editor.nodes(editor, {
            match: (n) => Element.isElement(n) && n.type === 'paragraph'
          })

          if (node) {
            const text = Node.string(node[0])
            if (!/@[^\n]*$/.test(text) || /\s{2,}$/.test(text)) {
              store.chat.setState((state) => {
                state.reference.open = false
                state.reference.domRect = null
              })
            }
          }
        }, 16)
      }
    },
    [editor]
  )

  const onChange = useCallback(() => {
    const text = editor.children.map((n) => Node.string(n)).join('\n')
    setState({ text: text.trim() })
    if (store.chat.state.reference.open) {
      const [node] = Editor.nodes(editor, {
        match: (n) => Element.isElement(n) && n.type === 'paragraph'
      })
      if (node) {
        const text = Node.string(node[0])
        const match = text.match(/@[^\n]*$/)
        if (match) {
          store.chat.setState((state) => {
            state.reference.keyword = match[0].slice(1)
          })
        }
      }
    }
  }, [])

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <span {...props.attributes}>{props.children}</span>,
    []
  )

  const renderElement = useCallback((props: RenderElementProps) => <Elements {...props} />, [])
  const addFile = useCallback(async () => {
    setState({ menuVisible: false })
    chooseFile((id: string, content: string | null) => {
      copyToClipboard(content!)
      setState((state) => {
        const item = state.files.find((f) => f.id === id)
        if (item) {
          item.content = content || ''
          item.status = content ? 'success' : 'error'
        }
      })
    }).then((files) => {
      setState({ files })
    })
  }, [])
  useEffect(() => {
    if (store.settings.state.showChatBot) {
      setTimeout(() => {
        EditorUtils.focus(editor)
      }, 16)
    }
  }, [store.settings.state.showChatBot])
  return (
    <div className={'chat-input w-full relative'}>
      <div className={'chat-input-mask'}></div>
      <div
        className={'pt-3 pb-2 px-4 w-full border dark:border-white/20 rounded-2xl border-black/40'}
      >
        <div className={'flex items-center space-x-1.5 relative -top-1 flex-wrap'}>
          {store.chat.state.cacheDocs.map((d, i) => (
            <div
              className={
                'text-xs rounded-sm px-1 py-0.5 dark:bg-white/5 flex items-center bg-black/10 mb-1'
              }
              key={i}
            >
              <FileText size={12} className={'mr-1'} />
              <span className={'max-w-40 truncate'}>{d.name}</span>
              <div
                className={'p-0.5 cursor-pointer'}
                onClick={() => {
                  store.chat.setState((state) => {
                    state.cacheDocs.splice(i, 1)
                  })
                  setTimeout(() => {
                    EditorUtils.focus(editor)
                  }, 16)
                }}
              >
                <X size={12} />
              </div>
            </div>
          ))}
        </div>
        {!!state.files.length && (
          <div className={'pb-3 flex items-center flex-wrap'}>
            {state.files.map((f, i) => (
              <div
                className={
                  'max-w-[200px] py-1.5 rounded-xl mr-2 mb-1 bg-white/10 pl-2 pr-1 relative group'
                }
                key={i}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={'text-sm truncate'} title={f.name}>
                    {f.name}
                  </span>
                  {f.status === 'pending' ? (
                    <span className={'text-xs scale-90 ml-2 dark:text-white/50'}>
                      <ILoad />
                    </span>
                  ) : (
                    <span className={'px-2 py-1 bg-black/20 rounded-full text-xs scale-90 ml-2'}>
                      {getFileExtension(f.name)}
                    </span>
                  )}
                  <div className="absolute -right-1 -top-1 h-5 w-5 flex items-center pr-2 group-hover:opacity-100 opacity-0">
                    <button
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors stroke-gray-400"
                      onClick={() => {
                        setState((state) => {
                          state.files.splice(i, 1)
                        })
                      }}
                    >
                      <CircleX size={16} className={'stroke-inherit'} />
                    </button>
                  </div>
                </div>
                {f.status === 'error' && (
                  <div className="text-xs text-red-500">{t('chat.input.parseError')}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* <div className={'pb-4 space-x-2'}>
          <div className={'w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex items-center justify-between relative group flex-wrap group'}>
            <img
              src={''}
              className={'w-full h-full object-cover'}
              alt=""
            />
            <div
              className={
                'absolute p-1 right-1 top-1 bg-white/10 rounded-lg flex items-center justify-center group-hover:opacity-100 opacity-0 stroke-gray-400 duration-200 cursor-pointer'
              }
            >
              <CircleX
                size={16}
                className={'stroke-inherit'}
              />
            </div>
          </div>
        </div> */}
        <div className={'max-h-[260px] overflow-y-auto overscroll-contain w-full py-1'}>
          <Slate editor={editor} initialValue={[EditorUtils.p]} onChange={onChange}>
            <Editable
              onDragOver={(e) => e.preventDefault()}
              spellCheck={false}
              onDrop={drop}
              className={
                'outline-none min-h-5 leading-5 w-full resize-none overflow-hidden h-auto text-[15px]'
              }
              onCompositionStart={compositionStart}
              placeholder={t('chat.input.placeholder')}
              onCompositionEnd={compositionEnd}
              renderElement={renderElement}
              onKeyDown={keydown}
              renderLeaf={renderLeaf}
            />
          </Slate>
        </div>
        <div
          className={
            'mt-3 flex justify-between items-center select-none dark:stroke-white/60 stroke-black/60'
          }
        >
          <div className={'flex items-center space-x-2'}>
            <Popover
              placement="topLeft"
              arrow={false}
              open={state.menuVisible}
              onOpenChange={(visible) => setState({ menuVisible: visible })}
              styles={{
                body: {
                  padding: 0
                }
              }}
              content={
                <div className={'py-1.5 w-32'}>
                  <div
                    className={
                      'flex items-center space-x-3 h-8 px-4 cursor-pointer dark:hover:bg-white/10 hover:bg-black/5 duration-100'
                    }
                    onClick={addFile}
                  >
                    <Paperclip size={16} />
                    <span>{t('chat.input.file')}</span>
                  </div>
                  <div
                    className={
                      'flex items-center space-x-3 h-8 px-4 cursor-pointer dark:hover:bg-white/10 hover:bg-black/5 duration-100'
                    }
                  >
                    <Image size={16} />
                    <span>{t('chat.input.image')}</span>
                  </div>
                </div>
              }
              trigger="click"
            >
              <div
                className={
                  'rounded-full w-7 h-7 flex items-center justify-center hover:dark:bg-white/10 cursor-pointer duration-200 hover:bg-black/10'
                }
              >
                <Plus size={20} className={'stroke-inherit'} />
              </div>
            </Popover>
            <Tooltip title={t('chat.input.webSearchTip')} mouseEnterDelay={1}>
              <div
                className={`rounded-full w-7 h-7 flex items-center justify-center cursor-pointer duration-200 ${ableWebSearch ? 'dark:bg-blue-500/50 bg-blue-500/80 stroke-white' : 'dark:hover:dark:bg-white/10 hover:bg-black/10'}`}
                onClick={() =>
                  store.chat.setWebSearch(activeChat ? !activeChat.websearch : !webSearch)
                }
              >
                <Earth size={15} className={'stroke-inherit'} />
              </div>
            </Tooltip>
            <Tooltip title={t('chat.input.docContextTip')} mouseEnterDelay={1}>
              <div
                className={`rounded-full w-7 h-7 flex items-center justify-center cursor-pointer duration-200 ${(activeChat ? activeChat.docContext : store.chat.state.docContext) ? 'dark:bg-blue-500/50 bg-blue-500/80 stroke-white' : 'dark:hover:dark:bg-white/10 hover:bg-black/10'}`}
                onClick={() => {
                  if (store.chat.state.activeChat) {
                    store.chat.updateChat(store.chat.state.activeChat!.id, {
                      docContext: !store.chat.state.activeChat?.docContext
                    })
                  } else {
                    store.chat.setState((state) => {
                      state.docContext = !state.docContext
                    })
                  }
                }}
              >
                <SquareLibrary size={15} className={'stroke-inherit'} />
              </div>
            </Tooltip>
          </div>
          <div>
            <div
              className={`rounded-full duration-200 w-8 h-8 flex items-center justify-center ${state.text || !!activeChat?.pending ? 'cursor-pointer dark:hover:dark:bg-white/10 hover:bg-black/10' : 'cursor-not-allowed'}`}
              onClick={send}
            >
              {activeChat?.pending ? (
                <IStop className={'w-4 h-4'} />
              ) : (
                <SendHorizontal
                  size={16}
                  className={
                    state.text
                      ? 'dark:stroke-white/80 stroke-black/80'
                      : 'stroke-black/50 dark:stroke-white/50'
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

const Elements = memo<RenderElementProps>(({ children, ...props }) => {
  switch (props.element.type) {
    default:
      return <p {...props.attributes}>{children}</p>
  }
})
