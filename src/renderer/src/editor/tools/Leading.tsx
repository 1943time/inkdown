import { useCallback, useEffect, useRef } from 'react'
import { useGetSetState } from 'react-use'
import { Node } from 'slate'
import { slugify } from '../utils/dom'
import { nanoid } from 'nanoid'
import { getOffsetTop } from '../../utils/dom'
import { TabStore } from '@/store/note/tab'
import { observer } from 'mobx-react-lite'
import { useSubject } from '@/hooks/common'
type Leading = {
  title: string
  level: number
  id: string
  key: string
  dom?: HTMLElement
  schema: object
}

const cache = new Map<object, Leading>()
const levelClass = new Map([
  [1, ''],
  [2, 'pl-3'],
  [3, 'pl-6'],
  [4, 'pl-9']
])

export const Heading = observer(({ tab }: { tab: TabStore }) => {
  const timer = useRef<number>(null)
  const [state, setState] = useGetSetState({
    headings: [] as Leading[],
    active: ''
  })
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    cache.clear()
    getHeading()
    setState({ active: '' })
  }, [tab.state.doc])

  const getHeading = useCallback(() => {
    if (tab.state.doc) {
      const schema = tab.state.doc.schema
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
                  cache.get(s)!.dom = tab.container?.querySelector(
                    `[data-head="${id}"]`
                  ) as HTMLElement
                }
              }, 200)
            }
          }
        }
        setState({ headings })
      } else {
        setState({ headings: [] })
      }
    } else {
      setState({ headings: [] })
    }
  }, [tab.state.doc])
  useSubject(tab.docChanged$, getHeading)
  useEffect(() => {
    const div = box.current
    if (div) {
      const scroll = (e: Event) => {
        const top = (e.target as HTMLElement).scrollTop
        const container = tab.container
        if (!container) return
        const heads = state().headings.slice().reverse()
        for (let h of heads) {
          if (h.dom && top > getOffsetTop(h.dom, container) - 20) {
            setState({ active: h.id })
            return
          }
        }
        setState({ active: '' })
      }
      div.addEventListener('scroll', scroll, { passive: true })
      return () => div.removeEventListener('scroll', scroll)
    }
    return () => {}
  }, [tab])
  if (!tab.state.doc) return null
  return (
    <div
      className={`sticky flex-shrink-0 top-0`}
      ref={(e) => {
        box.current = e?.parentElement?.parentElement?.parentElement || null
      }}
    >
      <div
        className={`h-full pt-10 pb-10 pr-4 overflow-y-auto hide-scrollbar overflow-x-hidden`}
        style={{ width: +200 }}
      >
        <div className={'text-gray-500 text-sm mb-4'}>{'大纲'}</div>
        <div className={'space-y-1 dark:text-gray-400 text-gray-600/90 text-sm break-words'}>
          {!!tab.state.doc && (
            <div
              onClick={() => {
                tab.container?.scroll({
                  top: 0,
                  behavior: 'smooth'
                })
              }}
              className={`cursor-pointer dark:hover:text-gray-200 hover:text-gray-800`}
            >
              {tab.state.doc.name}
            </div>
          )}
          {state().headings.map((h) => (
            <div
              key={h.key}
              onClick={() => {
                if (h.dom && tab.container) {
                  h.dom.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className={`${levelClass.get(h.level)} cursor-pointer ${state().active === h.id ? 'dark:text-white text-black' : 'dark:hover:text-gray-200 hover:text-gray-800'}`}
            >
              {h.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
