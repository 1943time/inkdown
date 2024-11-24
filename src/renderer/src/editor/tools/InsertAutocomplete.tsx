import { observer } from 'mobx-react-lite'
import { ReactNode, useCallback, useEffect, useMemo, useRef, WheelEvent } from 'react'
import { Editor, Element, Node, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { Icon } from '@iconify/react'
import { runInAction } from 'mobx'
import isHotkey from 'is-hotkey'
import { useEditorStore } from '../store'
import { Methods } from '../../types/index'
import { keyTask$ } from '../../hooks/keyboard'
import { useLocalState } from '../../hooks/useLocalState'
import { useSubject } from '../../hooks/subscribe'
import { EditorUtils } from '../utils/editorUtils'
import IMermaid from '../../icons/IMermaid'
import { getOffsetLeft, getOffsetTop } from '../utils/dom'
import { TextHelp } from '../../components/set/Help'
import { Button, Input, Tabs } from 'antd'
import { IPlanet } from '../../icons/IPlanet'
import { message$ } from '../../utils'
import { getRemoteMediaType } from '../utils/media'
import { selChange$ } from '../plugins/useOnchange'
import { MainApi } from '../../api/main'
import { cpSync, existsSync, statSync } from 'fs'
import { basename, join, parse, relative } from 'path'
import { toUnixPath } from '../../utils/path'
import { useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'
import { KeyboardTask } from '../../store/logic/keyboard'

type InsertOptions = {
  label: [string, string]
  key: string
  children: {
    label: [string, string]
    key: string
    task: Methods<KeyboardTask> | 'attachment'
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

const getInsertOptions: (ctx: { isTop: boolean }) => InsertOptions[] = (ctx) => {
  const options: InsertOptions[] = [
    {
      label: ['元素', 'Elements'],
      key: 'element',
      children: [
        {
          label: ['表格', 'Table'],
          key: 'table',
          task: 'insertTable',
          icon: <Icon icon={'material-symbols:table'} className={'text-base'} />
        },
        {
          label: ['引用', 'Quote'],
          key: 'quote',
          task: 'insertQuote',
          icon: <Icon icon={'iconoir:quote-solid'} className={'text-base'} />
        },
        {
          label: ['代码', 'Code'],
          key: 'code',
          task: 'insertCode',
          icon: <Icon icon={'ic:sharp-code'} className={'text-base'} />
        },
        {
          label: ['分割线', 'Horizontal line'],
          key: 'horizontal-line',
          task: 'horizontalLine',
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
          task: 'localImage',
          icon: <Icon icon={'material-symbols:image-outline'} className={'text-base'} />
        },
        {
          label: ['视频', 'Video'],
          key: 'video',
          task: 'localImage',
          args: ['video'],
          icon: <Icon icon={'ri:video-line'} className={'text-base'} />
        },
        {
          label: ['远程媒体', 'Media link'],
          task: 'image',
          key: 'media-link',
          args: ['', true],
          icon: <Icon icon={'ic:round-perm-media'} className={'text-base'} />
        },
        {
          label: ['附件', 'Attachment'],
          task: 'attachment',
          key: 'attachment',
          icon: <Icon icon={'hugeicons:attachment-square'} className={'text-base'} />
        }
      ]
    },
    {
      label: ['扩展', 'Extension'],
      key: 'extension',
      children: [
        {
          label: ['公式块', 'Formula block'],
          task: 'insertCode',
          key: 'formula-block',
          args: ['katex'],
          icon: <Icon icon={'pajamas:formula'} className={'text-base'} />
        },
        {
          label: ['行内公式', 'Formula inline'],
          key: 'formula-inline',
          task: 'inlineKatex',
          icon: <Icon icon={'pajamas:formula'} className={'text-base'} />
        },
        {
          label: ['Mermaid 图形', 'Mermaid graphics'],
          task: 'insertCode',
          key: 'mermaid',
          args: ['mermaid'],
          icon: <IMermaid className={'text-sm'} />
        },
        {
          label: ['HTML', 'HTML'],
          task: 'insertCode',
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
          task: 'list',
          key: 'b-list',
          args: ['unordered'],
          icon: <Icon icon={'ion:list-sharp'} className={'text-base'} />
        },
        {
          label: ['有序列表', 'Numbered list'],
          task: 'list',
          key: 'n-list',
          args: ['ordered'],
          icon: <Icon icon={'ph:list-numbers-bold'} className={'text-base'} />
        },
        {
          label: ['任务列表', 'Todo list'],
          task: 'list',
          key: 't-list',
          args: ['task'],
          icon: <Icon icon={'lucide:list-todo'} className={'text-base'} />
        }
      ]
    }
  ]
  if (ctx.isTop) {
    options.splice(2, 0, {
      label: ['标题', 'Heading'],
      key: 'head',
      children: [
        {
          label: ['标题 1', 'Heading 1'],
          task: 'head',
          key: 'head1',
          args: [1],
          icon: <Icon icon={'gravity-ui:heading-1'} className={'text-base'} />
        },
        {
          label: ['标题2', 'Heading 2'],
          task: 'head',
          key: 'head2',
          icon: <Icon icon={'gravity-ui:heading-2'} className={'text-base'} />,
          args: [2]
        },
        {
          label: ['标题3', 'Heading 3'],
          task: 'head',
          key: 'head3',
          icon: <Icon icon={'gravity-ui:heading-3'} className={'text-base'} />,
          args: [3]
        },
        {
          label: ['标题4', 'Heading 4'],
          task: 'head',
          key: 'head4',
          icon: <Icon icon={'gravity-ui:heading-4'} className={'text-base'} />,
          args: [4]
        }
      ]
    })
  }
  return options
}

export const InsertAutocomplete = observer(() => {
  const core = useCoreContext()
  const store = useEditorStore()
  const {t} = useTranslation()
  const dom = useRef<HTMLDivElement>(null)
  const ctx = useRef<{
    path: number[]
    isTop: boolean
  }>({ path: [], isTop: true })
  const [state, setState] = useLocalState({
    index: 0,
    filterOptions: [] as InsertOptions[],
    options: [] as InsertOptions['children'],
    left: 0,
    insertLink: false,
    insertAttachment: false,
    loading: false,
    insertUrl: '',
    top: 0 as number | undefined,
    bottom: 0 as number | undefined,
    text: ''
  })
  const selectedKey = useMemo(() => {
    return state.options[state.index]?.key
  }, [state.index, state.options, state.text])

  const clickClose = useCallback((e: Event) => {
    if (!dom.current?.contains(e.target as HTMLElement)) {
      close()
    }
  }, [])

  const close = useCallback(() => {
    setState({
      filterOptions: [],
      options: [],
      index: 0,
      text: '',
      insertLink: false,
      insertAttachment: false,
      insertUrl: ''
    })
    window.removeEventListener('click', clickClose)
  }, [])

  const insert = useCallback((op: InsertOptions['children'][number]) => {
    if (op.task === 'image' || op.task === 'attachment') {
      if (op.task === 'image') {
        setState({ insertLink: true })
        setTimeout(() => {
          dom.current?.querySelector('input')?.focus()
        }, 30)
      } else {
        setState({insertAttachment: true})
      }
    } else if (op) {
      Transforms.insertText(store.editor, '', {
        at: {
          anchor: Editor.start(store.editor, ctx.current.path),
          focus: Editor.end(store.editor, ctx.current.path)
        }
      })
      keyTask$.next({
        key: op.task,
        args: op.args
      })
      runInAction(() => {
        store.openInsertCompletion = false
      })
      close()
    }
  }, [])

  const insertAttachByLink = useCallback(async () => {
    setState({ loading: true })
    try {
      let url = state.insertUrl
      let size = 0
      let name = url
      if (/^https?:\/\//.test(url)) {
        const res = await window.api.fetch(url)
        if (!res.ok) {
          message$.next({
            type: 'info',
            content: 'The resource could not be loaded.'
          })
          throw new Error()
        }
        size = Number(res.headers.get('content-length') || 0)
        const match = url.match(/([\w\_\-]+)\.\w+$/)
        if (match) {
          name = match[1]
        }
      } else if (!existsSync(url)) {
        message$.next({
          type: 'info',
          content: 'Please enter a valid link.'
        })
        throw new Error()
      } else {
        name = basename(url)
        const imgDir = await store.getImageDir()
        const copyPath = join(imgDir, name)
        cpSync(url, copyPath)
        const stat = statSync(copyPath)
        url = toUnixPath(relative(join(store.openFilePath!, '..'), copyPath))
        size = stat.size
      }
      Transforms.insertText(store.editor, '', {
        at: {
          anchor: Editor.start(store.editor, ctx.current.path),
          focus: Editor.end(store.editor, ctx.current.path)
        }
      })
      const node = {
        type: 'attach',
        name,
        url,
        size,
        children: [{ text: '' }]
      }
      Transforms.setNodes(store.editor, node, { at: ctx.current.path })
      EditorUtils.focus(store.editor)
      const next = Editor.next(store.editor, { at: ctx.current.path })
      if (next?.[0].type === 'paragraph' && !Node.string(next[0])) {
        Transforms.delete(store.editor, { at: next[1] })
      }
      const [m] = Editor.nodes(store.editor, {
        match: (n) => !!n.type,
        mode: 'lowest'
      })
      selChange$.next({ node: m, sel: store.editor.selection })
      close()
    } finally {
      setState({ loading: false })
    }
  }, [])

  const keydown = useCallback((e: KeyboardEvent) => {
    if (state.options.length && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      if (e.key === 'ArrowUp' && state.index > 0) {
        setState({ index: state.index - 1 })
        const key = state.options[state.index].key
        const target = document.querySelector(`[data-action="${key}"]`) as HTMLDivElement
        if (target && dom.current!.scrollTop > target.offsetTop) {
          dom.current!.scroll({
            top: dom.current!.scrollTop - 160 + 30
          })
        }
      }
      if (e.key === 'ArrowDown' && state.index < state.options.length - 1) {
        setState({ index: state.index + 1 })
        const key = state.options[state.index].key
        const target = document.querySelector(`[data-action="${key}"]`) as HTMLDivElement
        if (target && target.offsetTop > dom.current!.scrollTop + dom.current!.clientHeight - 30) {
          dom.current!.scroll({
            top: target.offsetTop - 30
          })
        }
      }
    }
    if (e.key === 'Enter' && store.openInsertCompletion) {
      const op = state.options[state.index]
      if (op) {
        e.preventDefault()
        e.stopPropagation()
        insert(op)
      }
    }
    if (isHotkey('esc', e)) {
      runInAction(() => {
        store.openInsertCompletion = false
      })
      EditorUtils.focus(store.editor)
    }
  }, [])

  useSubject(store.insertCompletionText$, (text) => {
    text = text || ''
    const insertOptions = getInsertOptions({
      isTop: ctx.current.isTop
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
      filterOptions
    })
  })

  const insertMedia = useCallback(async () => {
    setState({ loading: true })
    try {
      let url = state.insertUrl
      for (const r of replaceUrl) {
        const m = url.match(r.reg)
        if (m) {
          url = r.replace(m)
          break
        }
      }
      if (!/^(\w+\:)?\/\//.test(url)) {
        message$.next({
          type: 'info',
          content: 'Please enter a valid link.'
        })
        throw new Error()
      }
      const type = await getRemoteMediaType(url)
      if (!type) {
        message$.next({
          type: 'info',
          content: 'The resource could not be loaded.'
        })
        throw new Error()
      }
      Transforms.insertText(store.editor, '', {
        at: {
          anchor: Editor.start(store.editor, ctx.current.path),
          focus: Editor.end(store.editor, ctx.current.path)
        }
      })
      const node = { type: 'media', url, children: [{ text: '' }] }
      Transforms.setNodes(store.editor, node, { at: ctx.current.path })
      EditorUtils.focus(store.editor)
      const [n] = Editor.nodes(store.editor, {
        match: n => !!n.type,
        mode: 'lowest'
      })
      selChange$.next({
        sel: store.editor.selection, node: n
      })
      close()
    } finally {
      setState({ loading: false })
    }
  }, [])

  useEffect(() => {
    if (store.openInsertCompletion) {
      const [node] = Editor.nodes<any>(store.editor, {
        match: (n) => Element.isElement(n),
        mode: 'lowest'
      })
      ctx.current = {
        path: node[1],
        isTop: EditorUtils.isTop(store.editor, node[1])
      }
      window.addEventListener('keydown', keydown)
      if (node[0].type === 'paragraph') {
        const el = ReactEditor.toDOMNode(store.editor, node[0])
        if (el) {
          let top = getOffsetTop(el, store.container!)
          if (
            top >
            store.container!.scrollTop + store.container!.clientHeight - 212 - el.clientHeight
          ) {
            setState({
              top: undefined,
              bottom: -(top - store.container!.clientHeight),
              left: getOffsetLeft(el, store.container!)
            })
          } else {
            setState({
              left: getOffsetLeft(el, store.container!),
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
  }, [store.openInsertCompletion])
  return (
    <div
      ref={dom}
      className={`
      ${!store.openInsertCompletion || !state.filterOptions.length ? 'hidden' : ''}
        absolute z-50 ${state.insertLink || state.insertAttachment ? 'w-80' : 'w-44'} max-h-52 overflow-y-auto p-1
        rounded-lg py-1 text-gray-700/90 ctx-panel dark:text-gray-300 dark:border-gray-200/10
      `}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      style={{
        left: state.left,
        top: state.top,
        bottom: state.bottom
      }}
    >
      {!state.insertLink && !state.insertAttachment && (
        <>
          <div className={'text-xs leading-6 pl-1 dark:text-gray-400 text-gray-500 mb-1'}>
            {t('quickActions')}
          </div>
          {state.filterOptions.map((l, i) => (
            <div key={l.key}>
              {i !== 0 && <div className={'my-1 h-[1px] dark:bg-gray-200/10 bg-gray-200/70'}></div>}
              <div>
                {l.children.map((el) => (
                  <div
                    key={el.key}
                    data-action={el.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      insert(state.options[state.index])
                    }}
                    onMouseEnter={() => {
                      setState({ index: state.options.findIndex((op) => op.key === el.key) })
                    }}
                    className={`h-7 rounded px-2 cursor-pointer flex items-center text-[13px] space-x-1.5
                  ${el.key === selectedKey ? 'bg-gray-100 dark:bg-gray-300/10' : ''}
                `}
                  >
                    {el.icon}
                    <span>{core.config.zh ? el.label[0] : el.label[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {state.insertLink && (
        <div className={'py-3 px-1'}>
          <div className={'text-sm flex items-center mb-2 dark:text-white/70 text-black/70'}>
            <IPlanet className={'text-sm'} />
            <span className={'mx-1'}>Embed media links</span>
            <TextHelp
              text={
                'Embed remote links. Please note whether the link allows access from other domains'
              }
            />
          </div>
          <Input
            placeholder={'Paste media link'}
            onMouseDown={(e) => e.stopPropagation()}
            value={state.insertUrl}
            onKeyDown={(e) => {
              if (isHotkey('enter', e)) {
                insertMedia()
              }
            }}
            onChange={(e) => setState({ insertUrl: e.target.value })}
          />
          <Button
            block={true}
            loading={state.loading}
            type={'primary'}
            className={'mt-4'}
            size={'small'}
            onClick={insertMedia}
            disabled={!state.insertUrl}
          >
            Embed
          </Button>
        </div>
      )}
      {state.insertAttachment && (
        <div className={'px-1 pb-3'}>
          <Tabs
            size={'small'}
            items={[
              {
                label: 'Local',
                key: 'local',
                children: (
                  <div>
                    <Button
                      block={true}
                      size={'small'}
                      type={'primary'}
                      onClick={() => {
                        MainApi.openDialog({
                          properties: ['openFile']
                        }).then(res => {
                          if (res.filePaths.length) {
                            Transforms.insertText(store.editor, '', {
                              at: {
                                anchor: Editor.start(store.editor, ctx.current.path),
                                focus: Editor.end(store.editor, ctx.current.path)
                              }
                            })
                            setState({insertUrl: res.filePaths[0]})
                            insertAttachByLink()
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
                      value={state.insertUrl}
                      onKeyDown={(e) => {
                        if (isHotkey('enter', e)) {
                          insertAttachByLink()
                        }
                      }}
                      onChange={(e) => setState({ insertUrl: e.target.value })}
                    />
                    <Button
                      block={true}
                      loading={state.loading}
                      type={'primary'}
                      className={'mt-4'}
                      size={'small'}
                      onClick={insertAttachByLink}
                      disabled={!state.insertUrl}
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
