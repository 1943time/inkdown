import {observer} from 'mobx-react-lite'
import {ReactNode, useCallback, useEffect, useMemo, useRef, WheelEvent} from 'react'
import {Editor, Element, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {Icon} from '@iconify/react'
import {runInAction} from 'mobx'
import isHotkey from 'is-hotkey'
import {useEditorStore} from '../store'
import {Methods} from '../../index'
import {KeyboardTask, keyTask$} from '../../hooks/keyboard'
import {useLocalState} from '../../hooks/useLocalState'
import {useSubject} from '../../hooks/subscribe'
import {EditorUtils} from '../utils/editorUtils'
import IMermaid from '../../icons/IMermaid'
import {getOffsetLeft, getOffsetTop} from '../utils/dom'

type InsertOptions = {
  label: string
  key: string,
  children: {
    label: string
    key: string
    task: Methods<KeyboardTask>
    args?: any[]
    icon?: ReactNode
  }[]
}
const getInsertOptions:(ctx: {isTop: boolean}) => InsertOptions[] = (ctx) => {
  const options: InsertOptions[] = [
    {
      label: 'Elements',
      key: 'element',
      children: [
        {
          label: 'Table',
          key: 'table',
          task: 'insertTable',
          icon: <Icon icon={'material-symbols:table'} className={'text-lg'}/>
        },
        {
          label: 'Quote',
          key: 'quote',
          task: 'insertQuote',
          icon: <Icon icon={'iconoir:quote-solid'} className={'text-lg'}/>
        },
        {
          label: 'Code',
          key: 'code',
          task: 'insertCode',
          icon: <Icon icon={'ic:sharp-code'} className={'text-lg'}/>
        },
        {
          label: 'Local image',
          key: 'local-image',
          task: 'localImage',
          icon: <Icon icon={'material-symbols:image-outline'} className={'text-lg'}/>
        },
        {
          label: 'Remote media',
          task: 'image',
          key: 'remote-media',
          args: ['', true],
          icon: <Icon icon={'ic:round-perm-media'} className={'text-lg'}/>
        },
        {
          label: 'Formula block',
          task: 'insertCode',
          key: 'formula-block',
          args: ['katex'],
          icon: <Icon icon={'pajamas:formula'} className={'text-lg'}/>
        },
        {
          label: 'Formula inline',
          key: 'formula-inline',
          task: 'inlineKatex',
          icon: <Icon icon={'pajamas:formula'} className={'text-lg'}/>
        },
        {
          label: 'Mermaid graphics',
          task: 'insertCode',
          key: 'mermaid',
          args: ['mermaid'],
          icon: <IMermaid className={'text-lg'}/>
        },
        {
          label: 'Horizontal line',
          key: 'horizontal-line',
          task: 'horizontalLine',
          icon: <Icon icon={'radix-icons:divider-horizontal'} className={'text-lg'}/>
        }
      ]
    },
    {
      label: 'List',
      key: 'list',
      children: [
        {
          label: 'Bulleted list',
          task: 'list',
          key: 'b-list',
          args: ['unordered'],
          icon: <Icon icon={'ion:list-sharp'} className={'text-lg'}/>
        },
        {
          label: 'Numbered list',
          task: 'list',
          key: 'n-list',
          args: ['ordered'],
          icon: <Icon icon={'ph:list-numbers-bold'} className={'text-lg'}/>
        },
        {
          label: 'Todo list',
          task: 'list',
          key: 't-list',
          args: ['task'],
          icon: <Icon icon={'lucide:list-todo'} className={'text-lg'}/>
        }
      ]
    }
  ]
  if (ctx.isTop) {
    options.splice(1, 0, {
      label: 'Heading',
      key: 'head',
      children: [
        {
          label: 'Heading 1',
          task: 'head',
          key: 'head1',
          args: [1],
          icon: <Icon icon={'gravity-ui:heading-1'} className={'text-lg'}/>
        },
        {
          label: 'Heading 2',
          task: 'head',
          key: 'head2',
          icon: <Icon icon={'gravity-ui:heading-2'} className={'text-lg'}/>,
          args: [2]
        },
        {
          label: 'Heading 3',
          task: 'head',
          key: 'head3',
          icon: <Icon icon={'gravity-ui:heading-3'} className={'text-lg'}/>,
          args: [3]
        },
        {
          label: 'Heading 4',
          task: 'head',
          key: 'head4',
          icon: <Icon icon={'gravity-ui:heading-4'} className={'text-lg'}/>,
          args: [4]
        }
      ]
    },)
  }
  return options
}

export const InsertAutocomplete = observer(() => {
  const store = useEditorStore()
  const dom = useRef<HTMLDivElement>(null)
  const ctx = useRef<{
    path: number[],
    isTop: boolean
  }>({path: [], isTop: true})
  const [state, setState] = useLocalState({
    index: 0,
    filterOptions: [] as InsertOptions[],
    options: [] as InsertOptions['children'],
    left: 0,
    top: 0 as number | undefined,
    bottom: 0 as number | undefined,
    text: ''
  })
  const selectedKey = useMemo(() => {
    return state.options[state.index]?.key
  }, [state.index, state.options, state.text])

  const close = useCallback(() => {
    setState({
      filterOptions: [],
      options: [],
      index: 0,
      text: ''
    })
  }, [])

  const insert = useCallback((op: InsertOptions['children'][number]) => {
    if (op) {
      Transforms.insertText(store.editor, '', {
        at: {
          anchor: Editor.start(store.editor, ctx.current.path),
          focus: Editor.end(store.editor, ctx.current.path),
        }
      })
      keyTask$.next({
        key: op.task,
        args: op.args
      })
      runInAction(() => {
        store.openInsertCompletion = false
      })
    }
    close()
  }, [])

  const keydown = useCallback((e: KeyboardEvent) => {
    if (state.options.length && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      if (e.key === 'ArrowUp' && state.index > 0) {
        setState({index: state.index - 1})
        const key = state.options[state.index].key
        const target = document.querySelector(`[data-action="${key}"]`) as HTMLDivElement
        if (target && dom.current!.scrollTop > target.offsetTop) {
          dom.current!.scroll({
            top: dom.current!.scrollTop - 160 + 30
          })
        }
      }
      if (e.key === 'ArrowDown' && state.index < state.options.length - 1) {
        setState({index: state.index + 1})
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
    }
  }, [])
  useSubject(store.insertCompletionText$, text => {
    text = text || ''
    const insertOptions = getInsertOptions({
      isTop: ctx.current.isTop
    })
    let filterOptions: InsertOptions[] = []
    let options: InsertOptions['children'] = []
    if (text) {
      for (let item of insertOptions) {
        const ops = item.children.filter(op => {
          return op.label.toLowerCase().includes(text.toLowerCase())
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
      options = insertOptions.reduce((a, b) => a.concat(b.children), [] as InsertOptions['children'])
    }
    setState({
      index: 0,
      text,
      options,
      filterOptions
    })
  })

  useEffect(() => {
    if (store.openInsertCompletion) {
      const [node] = Editor.nodes<any>(store.editor, {
        match: n => Element.isElement(n),
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
          if (top > store.container!.scrollTop + store.container!.clientHeight - 212 - el.clientHeight) {
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
        dom.current?.scroll({top: 0})
      })
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
      absolute z-50 w-44 max-h-52 overflow-y-auto p-1.5
      border border-stone-200 rounded-lg py-1 text-gray-700/90 card-bg dark:text-gray-300 dark:border-gray-200/10
      `}
      onMouseDown={e => {
        e.preventDefault()
      }}
      style={{
        left: state.left,
        top: state.top,
        bottom: state.bottom
      }}
    >
      {state.filterOptions.map((l, i) =>
        <div
          key={l.key}
        >
          <div className={'text-xs leading-6 pl-2 dark:text-gray-500 text-gray-400'}>{l.label}</div>
          <div>
            {l.children.map(el =>
              <div
                key={el.key}
                data-action={el.key}
                onClick={(e) => {
                  e.stopPropagation()
                  insert(state.options[state.index])
                }}
                onMouseEnter={() => {
                  setState({index: state.options.findIndex(op => op.key === el.key)})
                }}
                className={`h-8 rounded px-2 cursor-pointer flex items-center text-sm space-x-1
                  ${el.key === selectedKey ? 'bg-gray-100 dark:bg-gray-300/10' : ''}
                `}>
                {el.icon}
                <span>
                  {el.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
