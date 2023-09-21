import {observer} from 'mobx-react-lite'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {IFileItem} from '../../index'
import {treeStore} from '../../store/tree'
import {useDebounce, useGetSetState} from 'react-use'
import {Node} from 'slate'
import {slugify} from '../utils/dom'
import {nanoid} from 'nanoid'
import {useEditorStore} from '../store'
import {ReactEditor} from 'slate-react'
import {configStore} from '../../store/config'
type Leading = {title: string, level: number, id: string, key: string, dom?: HTMLElement, schema: object}

const cache = new WeakMap<object, Leading>
const levelClass = new Map([
  [2, ''],
  [3, 'pl-4'],
  [4, 'pl-8']
])
export const Heading = observer(({note}: {
  note: IFileItem
}) => {
  const store = useEditorStore()
  const [state, setState] = useGetSetState({
    headings: [] as Leading[],
    active: ''
  })
  const box = useRef<HTMLElement>()
  useEffect(() => {
    for (let h of state().headings) {
      cache.delete(h.schema)
    }
    setState({active: ''})
  }, [note])
  useDebounce(() => {
    if (note) {
      const schema = treeStore.schemaMap.get(note)?.state
      if (schema?.length) {
        const headings: Leading[] = []
        for (let s of schema) {
          if (s.type === 'head' && s.level > 1 && s.level <= configStore.config.leadingLevel) {
            if (cache.get(s)) {
              headings.push(cache.get(s)!)
              continue
            }
            const title = Node.string(s)
            if (title) {
              cache.set(s, {
                title,
                level: s.level,
                id: slugify(title),
                key: nanoid(),
                schema: s,
              })
              headings.push(cache.get(s)!)
              requestIdleCallback(() => {
                cache.get(s)!.dom = ReactEditor.toDOMNode(store.editor, s)
              })
            }
          }
        }
        setState({headings})
      } else {
        setState({headings: []})
      }
    } else {
      setState({headings: []})
    }
  }, 100, [note, note?.refresh, configStore.config.leadingLevel])

  useEffect(() => {
    const div = box.current
    if (div) {
      const scroll = (e: Event) => {
        const top = (e.target as HTMLElement).scrollTop
        const heads = state().headings.slice().reverse()
        for (let h of heads) {
          if (h.dom && top > h.dom.offsetTop - 20) {
            setState({active: h.id})
            return
          }
        }
        setState({active: ''})
      }
      div.addEventListener('scroll', scroll)
      return () => div.removeEventListener('scroll', scroll)
    }
    return () => {}
  }, [])
  return (
    <div
      className={`${configStore.config.showLeading ? 'lg:block' : ''} hidden sticky ${store.openSearch ? 'top-[46px] h-[calc(100vh_-_86px)]' : 'top-0 h-[calc(100vh_-_40px)]'} pl-4 border-l b1 flex-shrink-0`}
      ref={e => {
        box.current = e?.parentElement?.parentElement?.parentElement || undefined
      }}
    >
      <div className={`w-56 h-full pt-10 pb-10 pr-4 overflow-y-auto`}>
        <div className={'text-gray-500 text-sm mb-4'}>{'Outline'}</div>
        <div className={'space-y-1 dark:text-gray-400 text-gray-600/90 text-sm'}>
          {state().headings.map(h =>
            <div
              key={h.key}
              onClick={() => {
                if (h.dom && box.current) {
                  box.current.scroll({
                    top: h.dom.offsetTop - 10,
                    behavior: 'smooth'
                  })
                }
              }}
              className={`${levelClass.get(h.level)} cursor-default ${state().active === h.id ? 'text-sky-500' : 'dark:hover:text-gray-200 hover:text-gray-800'}`}>
              {h.title}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
