import { observer } from 'mobx-react-lite'
import { useGetSetState } from 'react-use'
import { useCallback, useEffect, useRef } from 'react'
import { IFileItem } from '../types/index'
import { Node } from 'slate'
import { ReactEditor } from 'slate-react'
import { SearchOutlined } from '@ant-design/icons'
import ArrowRight from '../icons/ArrowRight'
import { useCoreContext } from '../store/core'
import { useTranslation } from 'react-i18next'
import { Ace, Range as AceRange } from 'ace-builds'

const visitSchema = (schema: any[], cb: (node: any) => void) => {
  for (let c of schema) {
    cb(c)
    if (c.children?.length) {
      visitSchema(c.children, cb)
    }
  }
}
export const FullSearch = observer(() => {
  const core = useCoreContext()
  const { t } = useTranslation()
  const [state, setState] = useGetSetState({
    unfold: false,
    searchResults: [] as {
      file: IFileItem
      results: { el: any; text: ''; codeLine?: number }[]
      fold?: boolean
    }[],
    foldIndex: [] as number[],
    searching: false
  })
  const dom = useRef<HTMLDivElement>(null)
  const toPoint = useCallback((target: HTMLElement) => {
    requestIdleCallback(() => {
      const top = core.tree.currentTab.store!.offsetTop(target)
      core.tree.currentTab.store!.container!.scroll({
        top: top - 100
      })
      target.classList.add('high-block')
      setTimeout(() => {
        target.classList.remove('high-block')
      }, 2000)
    })
  }, [])

  const toNode = useCallback((res: { el: any; file: IFileItem, codeLine?: number }) => {
    if (res.el) {
      if (core.tree.openedNote !== res.file) {
        core.tree.openNote(res.file, false)
        setTimeout(() => {
          requestIdleCallback(() => {
            try {
              if (res.el.type === 'code' && typeof res.codeLine === 'number') {
                const editor = core.tree.currentTab.store.codes.get(res.el)
                if (editor) {
                  const line = editor.container.querySelectorAll<HTMLElement>('.ace_line')[res.codeLine]
                  if (line) {
                    toPoint(line)
                    return
                  }
                }
              }
              const dom = ReactEditor.toDOMNode(core.tree.currentTab.store?.editor!, res.el)
              if (dom) toPoint(dom)
            } catch (e) {
              console.warn('dom not find', e)
            }
          })
        }, 200)
      } else {
        try {
          if (res.el.type === 'code' && typeof res.codeLine === 'number') {
            const editor = core.tree.currentTab.store.codes.get(res.el)
            if (editor) {
              const line = editor.container.querySelectorAll<HTMLElement>('.ace_line')[res.codeLine]
              if (line) {
                toPoint(line)
                return
              }
            }
          }
          const dom = ReactEditor.toDOMNode(core.tree.currentTab.store?.editor!, res.el)
          if (dom) toPoint(dom)
        } catch (e) {
          console.warn('dom not find')
        }
      }
    } else {
      if (core.tree.openedNote !== res.file) {
        core.tree.openNote(res.file, false)
      }
      setTimeout(() => {
        const title = document.querySelector('.page-title') as HTMLElement
        if (title) {
          toPoint(title)
        }
      }, 100)
    }
  }, [])
  const timer = useRef(0)
  const search = useCallback((immediate?: true) => {
    clearTimeout(timer.current)
    setState({ searching: true })
    timer.current = window.setTimeout(
      () => {
        if (!core.tree.searchKeyWord.trim() || !core.tree.nodes.length) {
          return setState({ searchResults: [] })
        }
        let results: any[] = []
        for (let f of core.tree.nodes) {
          let res: {
            file: IFileItem
            results: { el: any; text: string; codeLine?: number }[]
          } | null = null
          let matchText = core.tree.searchKeyWord.toLowerCase()
          if (f.ext === 'md' && f.filename.toLowerCase().includes(matchText)) {
            if (!res) res = { file: f, results: [] }
            res.results.push({
              el: null,
              text: f.filename
                .toLowerCase()
                .replaceAll(
                  matchText,
                  '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>'
                )
            })
          }
          if (f.schema) {
            visitSchema(f.schema, (node) => {
              if (['paragraph', 'table-cell', 'code', 'head'].includes(node.type)) {
                if (node.type === 'code') {
                  const lines = (node.code as string || '').split('\n')
                  lines.map((l, i) => {
                    const str = l.toLowerCase()
                    if (str && str.includes(matchText)) {
                      if (!res) res = { file: f, results: [] }
                      res.results.push({
                        el: node,
                        text: str.replaceAll(
                          matchText,
                          '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>'
                        ),
                        codeLine: i
                      })
                    }
                  })
                } else {
                  let str = Node.string(node)
                  str = str.toLowerCase()
                  if (str && str.includes(matchText)) {
                    if (!res) res = { file: f, results: [] }
                    res.results.push({
                      el: node,
                      text: str.replaceAll(
                        matchText,
                        '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>'
                      )
                    })
                  }
                }
              }
            })
          }
          if (res) results.push(res)
        }
        setState({ searchResults: results, foldIndex: [], searching: false })
      },
      immediate ? 0 : 300
    )
  }, [])
  useEffect(() => {
    if (core.tree.treeTab === 'search') {
      if (core.tree.searchKeyWord) {
        search()
      }
      dom.current?.querySelector('input')?.focus()
    }
  }, [core.tree.treeTab])
  return (
    <div className={'py-1 h-full'} ref={dom}>
      <div className={'px-4 relative'}>
        <SearchOutlined
          className={
            'absolute left-6 top-1/2 -translate-y-1/2 z-10 dark:text-gray-500 text-gray-400'
          }
        />
        <input
          value={core.tree.searchKeyWord}
          autoFocus={true}
          className={'input h-8 w-full pl-7'}
          onChange={(e) => {
            core.tree.setState({ searchKeyWord: e.target.value })
            search()
          }}
          placeholder={t('search')}
        />
      </div>
      <div className={'py-3 px-5 space-y-3 h-[calc(100%_-_1.5rem)] overflow-y-auto'}>
        {!state().searching && !state().searchResults.length && core.tree.searchKeyWord && (
          <div className={'text-center text-sm text-gray-400 px-5 w-full break-all'}>
            <span>
              {t('noResult')}
              <span className={'text-indigo-500 inline'}>{core.tree.searchKeyWord}</span>
            </span>
          </div>
        )}
        <div className={'space-y-3'}>
          {state()
            .searchResults.slice(0, 100)
            .map((s, i) => (
              <div key={i}>
                <div
                  className={
                    'flex justify-between items-center dark:text-gray-300 text-gray-600 text-sm cursor-pointer select-none'
                  }
                  onClick={() => {
                    if (state().foldIndex.includes(i)) {
                      setState({ foldIndex: state().foldIndex.filter((index) => index !== i) })
                    } else {
                      setState({ foldIndex: [...state().foldIndex, i] })
                    }
                  }}
                >
                  <div className={'flex items-center flex-1 w-0'}>
                    <div className={'p-1'}>
                      <ArrowRight
                        className={`w-3 h-3 duration-200 dark:text-gray-500 text-gray-400 ${
                          state().foldIndex.includes(i) ? '' : 'rotate-90'
                        }`}
                      />
                    </div>
                    <div className={'flex-1 w-full truncate'}>{s.file.filename}</div>
                  </div>
                  <span className={'ml-2 dark:text-gray-500 pr-1 text-gray-600'}>
                    {s.results.length}
                  </span>
                </div>
                {!state().foldIndex.includes(i) && (
                  <div
                    className={
                      'space-y-2 text-xs dark:text-white/80 text-black/80 rounded py-2 px-3 dark:bg-black/30 bg-gray-300/60 mt-1'
                    }
                  >
                    {s.results.slice(0, 100).map((r, j) => (
                      <div
                        key={j}
                        onClick={() => toNode({ el: r.el, file: s.file, codeLine: r.codeLine })}
                        className={
                          'cursor-pointer dark:hover:text-white hover:text-black group break-all ellipsis-10'
                        }
                        dangerouslySetInnerHTML={{ __html: r.text }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
})
