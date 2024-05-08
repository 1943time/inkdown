import {observer} from 'mobx-react-lite'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {IFileItem} from '../../index'
import {treeStore} from '../../store/tree'
import {useDebounce, useGetSetState} from 'react-use'
import {Node} from 'slate'
import {getOffsetTop, slugify} from '../utils/dom'
import {nanoid} from 'nanoid'
import {useEditorStore} from '../store'
import {configStore} from '../../store/config'
type Leading = {title: string, level: number, id: string, key: string, dom?: HTMLElement, schema: object}

const cache = new Map<object, Leading>
const levelClass = new Map([
  [1, ''],
  [2, 'pl-3'],
  [3, 'pl-6'],
  [4, 'pl-9']
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
    cache.clear()
    getHeading()
    setState({active: ''})
  }, [note, treeStore.currentTab])

  const getHeading = useCallback(() => {
    if (note && configStore.config.showLeading) {
      const schema = note.schema
      if (schema?.length) {
        const headings: Leading[] = []
        for (let s of schema) {
          if (s.type === 'head' && s.level <= 4) {
            if (cache.get(s)) {
              headings.push(cache.get(s)!)
              continue
            }
            const title = Node.string(s)
            const id = slugify(title)
            if (title) {
              cache.set(s, {
                title,
                level: s.level,
                id,
                key: nanoid(),
                schema: s
              })
              headings.push(cache.get(s)!)
              setTimeout(() => {
                if (cache.get(s)) {
                  cache.get(s)!.dom = store.container?.querySelector(`[data-head="${id}"]`) as HTMLElement
                }
              }, 200)
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
  }, [note])

  useDebounce(getHeading, 100, [note, note?.refresh, configStore.config.showLeading])

  useEffect(() => {
    const div = box.current
    if (div) {
      const scroll = (e: Event) => {
        const top = (e.target as HTMLElement).scrollTop
        const container = store.container
        if (!container) return
        const heads = state().headings.slice().reverse()
        for (let h of heads) {
          if (h.dom && top > getOffsetTop(h.dom, container) - 20) {
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
  const pt = useMemo(() => {
    let pt = 70
    if (store.openSearch) pt += 46
    return pt
  }, [treeStore.tabs.length, store.openSearch])
  return (
    <div
      style={{
        top: pt - 40,
        height: `calc(100vh - ${pt}px)`
      }}
      className={`${configStore.config.showLeading ? 'lg:block' : ''} hidden sticky flex-shrink-0`}
      ref={e => {
        box.current = e?.parentElement?.parentElement?.parentElement || undefined
      }}
    >
      <div className={`h-full pt-10 pb-10 pr-4 overflow-y-auto`} style={{width: configStore.config.leadingWidth}}>
        <div className={'text-gray-500 text-sm mb-4'}>{configStore.zh ? '大纲' : 'Outline'}</div>
        <div className={'space-y-1 dark:text-gray-400 text-gray-600/90 text-sm'}>
          {!!note &&
            <div
              onClick={() => {
                store.container?.scroll({
                  top: 0,
                  behavior: 'smooth'
                })
              }}
              className={`cursor-default dark:hover:text-gray-200 hover:text-gray-800`}>
              {note.filename}
            </div>
          }
          {state().headings.map(h =>
            <div
              key={h.key}
              onClick={() => {
                if (h.dom && store.container) {
                  store.container.scroll({
                    top: getOffsetTop(h.dom, store.container) - 10,
                    behavior: 'smooth'
                  })
                }
              }}
              className={`${levelClass.get(h.level)} cursor-default ${state().active === h.id ? 'text-blue-500' : 'dark:hover:text-gray-200 hover:text-gray-800'}`}>
              {h.title}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
