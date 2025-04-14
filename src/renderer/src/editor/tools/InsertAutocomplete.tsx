import { memo, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { Editor, Element, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import isHotkey from 'is-hotkey'
import { Icon } from '@iconify/react'
import { EditorUtils } from '../utils/editorUtils'
import { getOffsetLeft, getOffsetTop } from '../../utils/dom'
import { Button, Input, Tabs, Tag, Tooltip } from 'antd'
import { selChange$ } from '../plugins/useOnchange'
import { fileOpen } from 'browser-fs-access'
import { TabStore } from '@/store/note/tab'
import { IPlanet } from '../icons/IPlanet'
import { TextHelp } from '@/ui/common/HelpText'
import { useGetSetState } from 'react-use'
import { useTab } from '@/store/note/TabCtx'
import { useShallow } from 'zustand/react/shallow'
import IMermaid from '../icons/IMermaid'

type InsertOptions = {
  label: [string, string]
  key: string
  children: {
    label: [string, string]
    key: string
    run?: () => void
    args?: any[]
    icon?: ReactNode
  }[]
}

const replaceUrl = [
  {
    reg: /https?:\/\/youtu.be\/([\w\-]+)(\?si=\w+)?/i,
    replace: (match: RegExpMatchArray) => {
      return `https://www.youtube.com/embed/${match[1]}${match[2] || ''}`
    }
  },
  {
    reg: /https?:\/\/www.bilibili.com\/video\/([\w\-]+)\/?/,
    replace: (match: RegExpMatchArray) => {
      return `https://player.bilibili.com/player.html?isOutside=true&bvid=${match[1]}`
    }
  },
  {
    reg: /src=["']([^"\n]+)["']/i,
    replace: (match: RegExpMatchArray) => {
      return match[1]
    }
  }
]
const getInsertOptions = ({ isTop, tab }: { isTop: boolean; tab: TabStore }) => {
  const options: InsertOptions[] = [
    {
      label: ['元素', 'Elements'],
      key: 'element',
      children: [
        {
          label: ['表格', 'Table'],
          key: 'table',
          run: () => {
            tab.keyboard.insertTable()
          },
          icon: <Icon icon={'material-symbols:table'} className={'text-base'} />
        },
        {
          label: ['引用', 'Quote'],
          key: 'quote',
          run() {
            tab.keyboard.insertQuote()
          },
          icon: <Icon icon={'iconoir:quote-solid'} className={'text-base'} />
        },
        {
          label: ['代码', 'Code'],
          key: 'code',
          run() {
            tab.keyboard.insertCode()
          },
          icon: <Icon icon={'ic:sharp-code'} className={'text-base'} />
        },
        {
          label: ['分割线', 'Horizontal line'],
          key: 'horizontal-line',
          run() {
            tab.keyboard.horizontalLine()
          },
          icon: <Icon icon={'radix-icons:divider-horizontal'} className={'text-base'} />
        }
      ]
    },
    {
      label: ['媒体', 'media'],
      key: 'media',
      children: [
        {
          label: ['图片', 'Image'],
          key: 'local-image',
          run() {
            tab.keyboard.localImage()
          },
          icon: <Icon icon={'material-symbols:image-outline'} className={'text-base'} />
        },
        {
          label: ['视频', 'Video'],
          key: 'video',
          run() {
            tab.keyboard.localImage('video')
          },
          icon: <Icon icon={'ri:video-line'} className={'text-base'} />
        },
        {
          label: ['远程媒体', 'Media link'],
          key: 'media-link',
          run() {
            // tab.keyboard.media()
          },
          args: ['', true],
          icon: <Icon icon={'ic:round-perm-media'} className={'text-base'} />
        }
      ]
    },
    {
      label: ['扩展', 'Extension'],
      key: 'extension',
      children: [
        {
          label: ['公式块', 'Formula block'],
          key: 'formula-block',
          args: ['katex'],
          run: () => {
            tab.keyboard.insertCode('katex')
          },
          icon: <Icon icon={'pajamas:formula'} className={'text-base'} />
        },
        {
          label: ['行内公式', 'Formula inline'],
          key: 'formula-inline',
          run: () => {
            tab.keyboard.inlineKatex()
          },
          icon: <Icon icon={'pajamas:formula'} className={'text-base'} />
        },
        {
          label: ['Mermaid 图形', 'Mermaid graphics'],
          key: 'mermaid',
          args: ['mermaid'],
          run: () => {
            tab.keyboard.insertCode('mermaid')
          },
          icon: <IMermaid className={'text-sm'} />
        },
        {
          label: ['HTML', 'HTML'],
          run: () => {
            tab.keyboard.insertCode('html')
          },
          key: 'html',
          args: ['html'],
          icon: <Icon icon={'icon-park-outline:html-five'} className={'text-base'} />
        }
      ]
    },
    {
      label: ['列表', 'List'],
      key: 'list',
      children: [
        {
          label: ['无序列表', 'Bulleted list'],
          key: 'b-list',
          run: () => {
            tab.keyboard.list('unordered')
          },
          args: ['unordered'],
          icon: <Icon icon={'ion:list-sharp'} className={'text-base'} />
        },
        {
          label: ['有序列表', 'Numbered list'],
          key: 'n-list',
          run: () => {
            tab.keyboard.list('ordered')
          },
          args: ['ordered'],
          icon: <Icon icon={'ph:list-numbers-bold'} className={'text-base'} />
        },
        {
          label: ['任务列表', 'Todo list'],
          key: 't-list',
          run: () => {
            tab.keyboard.list('task')
          },
          args: ['task'],
          icon: <Icon icon={'lucide:list-todo'} className={'text-base'} />
        }
      ]
    }
  ]
  if (isTop) {
    options.splice(2, 0, {
      label: ['标题', 'Heading'],
      key: 'head',
      children: [
        {
          label: ['标题 1', 'Heading 1'],
          key: 'head1',
          run: () => {
            tab.keyboard.head(1)
          },
          args: [1],
          icon: <Icon icon={'gravity-ui:heading-1'} className={'text-base'} />
        },
        {
          label: ['标题2', 'Heading 2'],
          key: 'head2',
          run: () => {
            tab.keyboard.head(2)
          },
          icon: <Icon icon={'gravity-ui:heading-2'} className={'text-base'} />,
          args: [2]
        },
        {
          label: ['标题3', 'Heading 3'],
          key: 'head3',
          run: () => {
            tab.keyboard.head(3)
          },
          icon: <Icon icon={'gravity-ui:heading-3'} className={'text-base'} />,
          args: [3]
        },
        {
          label: ['标题4', 'Heading 4'],
          key: 'head4',
          run: () => {
            tab.keyboard.head(4)
          },
          icon: <Icon icon={'gravity-ui:heading-4'} className={'text-base'} />,
          args: [4]
        }
      ]
    })
  }
  return options
}

export const InsertAutocomplete = memo(() => {
  const dom = useRef<HTMLDivElement>(null)
  const tab = useTab()
  const ctx = useRef<{
    path: number[]
    isTop: boolean
  }>({ path: [], isTop: true })
  const [openInsertCompletion] = tab.useState(useShallow((state) => [state.openInsertCompletion]))
  const [state, setState] = useGetSetState({
    index: 0,
    filterOptions: [] as InsertOptions[],
    options: [] as InsertOptions['children'],
    left: 0,
    insertLink: false,
    loading: false,
    insertUrl: '',
    insertAttach: false,
    top: 0 as number | undefined,
    bottom: 0 as number | undefined,
    text: ''
  })
  const selectedKey = useMemo(() => {
    return state().options[state().index]?.key
  }, [state().index, state().options, state().text])

  const clickClose = useCallback((e: Event) => {
    if (!dom.current?.contains(e.target as HTMLElement)) {
      close()
    }
  }, [])

  const close = useCallback(() => {
    tab.useState.setState({ openInsertCompletion: false })
    setState({
      filterOptions: [],
      options: [],
      index: 0,
      text: '',
      insertLink: false,
      insertAttach: false,
      insertUrl: ''
    })
    window.removeEventListener('click', clickClose)
  }, [tab])

  const insertMedia = useCallback(async () => {
    setState({ loading: true })
    try {
      let url = state().insertUrl
      for (const r of replaceUrl) {
        const m = url.match(r.reg)
        if (m) {
          url = r.replace(m)
          break
        }
      }
      if (!/^(\w+\:)?\/\//.test(url)) {
        tab.store.msg.info('Please enter a valid link.')
        throw new Error()
      }
      // const type = await core.getRemoteMediaType(url)
      // if (!type) {
      //   core.message.info('The resource could not be loaded.')
      //   throw new Error()
      // }
      // Transforms.insertText(store.editor, '', {
      //   at: {
      //     anchor: Editor.start(store.editor, ctx.current.path),
      //     focus: Editor.end(store.editor, ctx.current.path)
      //   }
      // })
      // const node = { type: 'media', url, children: [{ text: '' }], mediaType: type }
      // Transforms.setNodes(store.editor, node, { at: ctx.current.path })
      // EditorUtils.focus(store.editor)
      // selChange$.next(ctx.current.path)
      close()
    } finally {
      setState({ loading: false })
    }
  }, [])

  const insertAttachByLink = useCallback(async () => {
    setState({ loading: true })
    try {
      let url = state().insertUrl
      if (!/^(\w+\:)?\/\//.test(url)) {
        tab.store.msg.info('Please enter a valid link.')
        throw new Error()
      }
      // const res = await core.api.getAttachmentHead.query({ url })
      // if (!res) {
      //   tab.store.msg.info('The resource could not be loaded.')
      //   throw new Error()
      // }
      // const size = Number(res['content-length'] || 0)
      // const name = url.match(/([\w\_\-]+)\.\w+$/)
      Transforms.insertText(tab.editor, '', {
        at: {
          anchor: Editor.start(tab.editor, ctx.current.path),
          focus: Editor.end(tab.editor, ctx.current.path)
        }
      })
      // const node = {
      //   type: 'attach',
      //   name: name ? name[1] : url,
      //   url,
      //   size,
      //   children: [{ text: '' }]
      // }
      // Transforms.setNodes(tab.editor, node, { at: ctx.current.path })
      // EditorUtils.focus(tab.editor)
      // selChange$.next(ctx.current.path)
      close()
    } finally {
      setState({ loading: false })
    }
  }, [])

  const run = useCallback(
    (op: InsertOptions['children'][number]) => {
      if (op.key === 'media' || op.key === 'attach') {
        if (op.key === 'media') {
          setState({ insertLink: true })
          setTimeout(() => {
            dom.current?.querySelector('input')?.focus()
          }, 30)
        } else {
          setState({ insertAttach: true })
        }
      } else {
        if (op) {
          Transforms.insertText(tab.editor, '', {
            at: {
              anchor: Editor.start(tab.editor, ctx.current.path),
              focus: Editor.end(tab.editor, ctx.current.path)
            }
          })
          op.run?.()
        }
        close()
      }
    },
    [tab]
  )

  const keydown = useCallback(
    (e: KeyboardEvent) => {
      if (state().options.length && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        if (e.key === 'ArrowUp' && state().index > 0) {
          setState({ index: state().index - 1 })
          const key = state().options[state().index].key
          const target = document.querySelector(`[data-action="${key}"]`) as HTMLDivElement
          if (target && dom.current!.scrollTop > target.offsetTop) {
            dom.current!.scroll({
              top: dom.current!.scrollTop - 160 + 30
            })
          }
        }
        if (e.key === 'ArrowDown' && state().index < state().options.length - 1) {
          setState({ index: state().index + 1 })
          const key = state().options[state().index].key
          const target = document.querySelector(`[data-action="${key}"]`) as HTMLDivElement
          if (
            target &&
            target.offsetTop > dom.current!.scrollTop + dom.current!.clientHeight - 30
          ) {
            dom.current!.scroll({
              top: target.offsetTop - 30
            })
          }
        }
      }
      if (e.key === 'Enter' && openInsertCompletion) {
        const op = state().options[state().index]
        if (op) {
          e.preventDefault()
          e.stopPropagation()
          run(op)
        }
      }
      if (isHotkey('esc', e)) {
        tab.useState.setState({ openInsertCompletion: false })
        EditorUtils.focus(tab.editor)
      }
    },
    [openInsertCompletion, tab]
  )
  useEffect(() => {
    tab.useState.subscribe(
      (state) => state.insertCompletionText,
      (text) => {
        text = text || ''
        const insertOptions = getInsertOptions({
          isTop: ctx.current.isTop,
          tab
        })
        let filterOptions: InsertOptions[] = []
        let options: InsertOptions['children'] = []
        if (text) {
          for (let item of insertOptions) {
            const ops = item.children.filter((op) => {
              return op.label.some((l) => l.toLowerCase().includes(text.toLowerCase()))
            })
            options.push(...ops)
            if (ops.length) {
              filterOptions.push({
                ...item,
                children: ops
              })
            }
          }
        } else {
          filterOptions = insertOptions
          options = insertOptions.reduce(
            (a, b) => a.concat(b.children),
            [] as InsertOptions['children']
          )
        }
        setState({
          index: 0,
          text,
          options,
          filterOptions,
          insertLink: false
        })
      }
    )
  }, [tab])

  useEffect(() => {
    if (openInsertCompletion) {
      setState({ insertLink: false })
      const [node] = Editor.nodes<any>(tab.editor, {
        match: (n) => Element.isElement(n),
        mode: 'lowest'
      })
      ctx.current = {
        path: node[1],
        isTop: EditorUtils.isTop(tab.editor, node[1])
      }
      window.addEventListener('keydown', keydown)
      if (node[0].type === 'paragraph') {
        const el = ReactEditor.toDOMNode(tab.editor, node[0])
        if (el) {
          let top = getOffsetTop(el, tab.container!)
          if (
            top >
            tab.container!.scrollTop + tab.container!.clientHeight - 212 - el.clientHeight
          ) {
            setState({
              top: undefined,
              bottom: -(top - tab.container!.clientHeight),
              left: getOffsetLeft(el, tab.container!)
            })
          } else {
            setState({
              left: getOffsetLeft(el, tab.container!),
              top: top + el.clientHeight,
              bottom: undefined
            })
          }
        }
      }
      setTimeout(() => {
        dom.current?.scroll({ top: 0 })
      })
      window.addEventListener('click', clickClose)
    } else {
      window.removeEventListener('keydown', keydown)
      close()
    }
  }, [openInsertCompletion, tab])
  return (
    <div
      ref={dom}
      className={`
      ${!openInsertCompletion || !state().filterOptions.length ? 'hidden' : ''}
      absolute z-50 ${state().insertLink || state().insertAttach ? 'w-80' : 'w-44'} max-h-52 overflow-y-auto p-1.5 ctx-panel rounded-lg py-1 text-black/80 card-bg dark:text-white/90
      `}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      style={{
        left: state().left,
        top: state().top,
        bottom: state().bottom
      }}
    >
      {!state().insertLink && !state().insertAttach && (
        <>
          <div className={'text-xs leading-6 pl-1 dark:text-white/60 text-black/60 mb-1'}>
            {'Quick Actions'}
          </div>
          {state().filterOptions.map((l, i) => (
            <div key={l.key}>
              {i !== 0 && <div className={'my-1 h-[1px] dark:bg-gray-200/10 bg-gray-200/70'}></div>}
              <div>
                {l.children.map((el) => (
                  <div
                    key={el.key}
                    data-action={el.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      run(el)
                    }}
                    onMouseEnter={() => {
                      setState({
                        index: state().options.findIndex((op) => op.key === el.key)
                      })
                    }}
                    className={`h-7 rounded px-2 cursor-pointer flex items-center text-[13px] space-x-1.5
                  ${el.key === selectedKey ? 'bg-gray-100 dark:bg-gray-300/10' : ''}
                `}
                  >
                    {el.icon}
                    <span>{el.label[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {state().insertLink && (
        <div className={'py-3 px-1'}>
          <div className={'text-sm flex items-center mb-2 dark:text-white/70 text-black/70'}>
            <IPlanet className={'text-sm'} />
            <span className={'mx-1'}>Embed media link</span>
            <TextHelp text={'Please note whether the link allows access from other domains'} />
          </div>
          <Input
            placeholder={'Paste media link'}
            onMouseDown={(e) => e.stopPropagation()}
            value={state().insertUrl}
            onKeyDown={(e) => {
              if (isHotkey('enter', e)) {
                insertMedia()
              }
            }}
            onChange={(e) => setState({ insertUrl: e.target.value })}
          />
          <Button
            block={true}
            loading={state().loading}
            type={'primary'}
            className={'mt-4'}
            size={'small'}
            onClick={insertMedia}
            disabled={!state().insertUrl}
          >
            Embed
          </Button>
        </div>
      )}
      {state().insertAttach && (
        <div className={'px-1 pb-2'}>
          <Tabs
            size={'small'}
            items={[
              {
                label: 'Upload',
                key: 'upload',
                children: (
                  <div>
                    <Button
                      block={true}
                      size={'small'}
                      type={'primary'}
                      onClick={() => {
                        window.api.dialog
                          .showOpenDialog({
                            properties: ['openFile']
                          })
                          .then(async (res) => {
                            if (res.filePaths.length) {
                              Transforms.insertText(tab.editor, '', {
                                at: {
                                  anchor: Editor.start(tab.editor, ctx.current.path),
                                  focus: Editor.end(tab.editor, ctx.current.path)
                                }
                              })
                              tab.keyboard.attach({
                                filePath: res.filePaths[0]
                              })
                              close()
                            }
                          })
                      }}
                    >
                      Choose a file
                    </Button>
                  </div>
                )
              },
              {
                label: 'Embed Link',
                key: 'embed',
                children: (
                  <div>
                    <Input
                      placeholder={'Paste attachment link'}
                      onMouseDown={(e) => e.stopPropagation()}
                      value={state().insertUrl}
                      onKeyDown={(e) => {
                        if (isHotkey('enter', e)) {
                          insertAttachByLink()
                        }
                      }}
                      onChange={(e) => setState({ insertUrl: e.target.value })}
                    />
                    <Button
                      block={true}
                      loading={state().loading}
                      type={'primary'}
                      className={'mt-4'}
                      size={'small'}
                      onClick={insertAttachByLink}
                      disabled={!state().insertUrl}
                    >
                      Embed
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}
    </div>
  )
})
