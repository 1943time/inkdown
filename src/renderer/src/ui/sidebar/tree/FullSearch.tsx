import { useGetSetState } from 'react-use'
import { useCallback, useEffect, useRef } from 'react'
import { Node } from 'slate'
import { ReactEditor } from 'slate-react'
import { SearchOutlined } from '@ant-design/icons'
import { useStore } from '@/store/store'
import { IDoc } from 'types/model'
import { ArrowLeft, ChevronRight, SquareLibrary } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { getOffsetTop } from '@/utils/dom'
import { delayRun } from '@/utils/common'
import { Tooltip } from '@lobehub/ui'
const visitSchema = (schema: any[], cb: (node: any) => void) => {
  for (let c of schema) {
    cb(c)
    if (c.children?.length) {
      visitSchema(c.children, cb)
    }
  }
}

export const FullSearch = observer(() => {
  const store = useStore()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useGetSetState({
    unfold: false,
    searchResults: [] as {
      doc: IDoc
      results: { el: any; text: ''; codeLine?: number }[]
      fold?: boolean
    }[],
    vectorResults: [] as {
      doc: IDoc
      results: { path: number; text: string }[]
      fold?: boolean
    }[],
    keyword: '',
    vector: false,
    foldIndex: [] as number[],
    searching: false
  })

  const toPoint = useCallback((target: HTMLElement) => {
    setTimeout(() => {
      const top = getOffsetTop(target, store.note.state.currentTab.container!)
      store.note.state.currentTab.container?.scroll({
        top: top - 50,
        behavior: 'instant'
      })
      target.classList.add('high-block')
      setTimeout(() => {
        target.classList.remove('high-block')
      }, 2000)
    })
  }, [])

  const toNode = useCallback((res: { el: any; doc: IDoc; codeLine?: number }) => {
    const tab = store.note.state.currentTab
    if (res.el) {
      if (tab.state.doc.id !== res.doc.id) {
        store.note.openDoc(res.doc)
        setTimeout(() => {
          requestIdleCallback(() => {
            try {
              if (res.el.type === 'code' && typeof res.codeLine === 'number') {
                const editor = tab?.codeMap.get(res.el)
                if (editor) {
                  const line =
                    editor.container.querySelectorAll<HTMLElement>('.ace_line')[res.codeLine]
                  if (line) {
                    toPoint(line)
                    return
                  }
                }
              }
              const dom = ReactEditor.toDOMNode(tab.editor!, res.el)
              if (dom) toPoint(dom)
            } catch (e) {
              console.warn('dom not find', e)
            }
          })
        }, 200)
      } else {
        try {
          if (res.el.type === 'code' && typeof res.codeLine === 'number') {
            const editor = tab.codeMap.get(res.el)
            if (editor) {
              const line = editor.container.querySelectorAll<HTMLElement>('.ace_line')[res.codeLine]
              if (line) {
                toPoint(line)
                return
              }
            }
          }
          const dom = ReactEditor.toDOMNode(tab.editor!, res.el)
          if (dom) toPoint(dom)
        } catch (e) {
          console.warn('dom not find')
        }
      }
    } else {
      if (tab.state.doc.id !== res.doc.id) {
        store.note.openDoc(res.doc)
      }
      setTimeout(() => {
        const title = document.querySelector('.page-title') as HTMLElement
        if (title) {
          toPoint(title)
        }
      }, 100)
    }
  }, [])
  const toggleVector = useCallback(() => {
    setState({ vector: !state().vector, searchResults: [], vectorResults: [], foldIndex: [] })
    if (state().keyword) {
      search()
    }
  }, [state().vector])
  const searchVector = useCallback(async (keyword: string) => {
    const ids = Object.keys(store.note.state.nodes)
    const results = await store.model
      .searchVector(keyword, store.note.state.currentSpace!.id, ids)
      .finally(() => {
        setState({ searching: false })
      })
    const docsMap = new Map<
      string,
      {
        path: number
        text: string
      }[]
    >()
    for (const r of results) {
      if (docsMap.has(r.doc_id)) {
        docsMap.get(r.doc_id)!.push({ path: r.path, text: r.content })
      } else {
        docsMap.set(r.doc_id, [{ path: r.path, text: r.content }])
      }
    }
    const nodes = store.note.state.nodes
    setState({
      vectorResults: Array.from(docsMap.entries()).map(([docId, ctx]) => {
        return {
          doc: nodes[docId],
          results: ctx
        }
      })
    })
  }, [])
  const toPath = useCallback((docId: string, path: number) => {
    const doc = store.note.state.nodes[docId]
    store.note.openDoc(doc)
    delayRun(() => {
      const el = doc.schema?.[path]
      if (el) {
        toNode({ el, doc, codeLine: 0 })
      }
    })
  }, [])
  const searchKeyword = useCallback(async (keyword: string) => {
    const docs = Object.values(store.note.state.nodes)
      .filter((d) => !d.folder)
      .sort((a, b) => Number(b.updated) - Number(a.updated))
    let results: any[] = []
    for (let i = 0; i < docs.length; i++) {
      if (results.length > 30) break
      let res: {
        doc: IDoc
        results: { el: any; text: string; codeLine?: number }[]
      } | null = null
      const f = docs[i]
      if (!f.schema) {
        const doc = await store.model.getDoc(f.id)
        if (doc) {
          f.schema = doc.schema
        }
      }
      if (!f.folder && f.name.toLowerCase().includes(keyword)) {
        if (!res) res = { doc: f, results: [] }
        res.results.push({
          el: null,
          text: f.name
            .toLowerCase()
            .replaceAll(
              keyword,
              '<span class="text-blue-500 dark:group-hover:text-blue-400 group-hover:text-blue-600">$&</span>'
            )
        })
      }
      if (f.schema) {
        visitSchema(f.schema, (node) => {
          if (['paragraph', 'table-cell', 'code', 'head'].includes(node.type)) {
            if (node.type === 'code') {
              const lines = ((node.code as string) || '').split('\n')
              lines.map((l, i) => {
                const str = l.toLowerCase()
                if (str && str.includes(keyword)) {
                  if (!res) res = { doc: f, results: [] }
                  res.results.push({
                    el: node,
                    text: str.replaceAll(
                      keyword,
                      '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>'
                    ),
                    codeLine: i
                  })
                }
              })
            } else {
              let str = Node.string(node)
              str = str.toLowerCase()
              if (str && str.includes(keyword)) {
                if (!res) res = { doc: f, results: [] }
                res.results.push({
                  el: node,
                  text: str.replaceAll(
                    keyword,
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
  }, [])
  const timer = useRef(0)
  const search = useCallback((immediate?: true) => {
    clearTimeout(timer.current)
    setState({ searching: true })
    timer.current = window.setTimeout(
      async () => {
        setState({ foldIndex: [] })
        const keyword = state().keyword.trim().toLowerCase()
        if (!keyword || !store.note.state.root.children?.length) {
          return setState({ searchResults: [] })
        }
        if (state().vector) {
          searchVector(keyword)
        } else {
          searchKeyword(keyword)
        }
      },
      immediate ? 0 : 300
    )
  }, [])
  useEffect(() => {
    if (store.note.state.view === 'search') {
      input.current?.focus()
      if (state().keyword) {
        search()
      }
    }
  }, [store.note.state.view])
  return (
    <div className={'h-full flex flex-col px-2 mt-1'}>
      <div className={'flex mb-2 px-1'}>
        <div
          onClick={() => store.note.setState({ view: 'folder' })}
          className={
            'text-sm flex px-1 py-1 items-center text-black/70 dark:text-white/70 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 duration-200 cursor-pointer'
          }
        >
          <ArrowLeft size={18} />
          <span className={'ml-1'}>返回</span>
        </div>
      </div>
      <div className={'px-2 relative'}>
        <SearchOutlined
          className={
            'absolute left-4 top-1/2 -translate-y-1/2 z-10 dark:text-gray-500 text-gray-400'
          }
        />
        <input
          ref={input}
          value={state().keyword}
          autoFocus={true}
          className={'input h-8 w-full px-7'}
          onChange={(e) => {
            setState({ keyword: e.target.value })
            search()
          }}
          placeholder={true ? '搜索' : 'Search'}
        />
        <Tooltip title={'使用文本向量进行语义化模糊搜索'} mouseEnterDelay={1}>
          <div
            className={`absolute rounded-sm duration-150 cursor-pointer p-0.5 dark:hover:bg-white/10 right-3.5 top-1/2 -translate-y-1/2 z-10 ${
              state().vector ? 'text-blue-500' : 'dark:text-white/70 text-black/70'
            }`}
            onClick={toggleVector}
          >
            <SquareLibrary size={14} />
          </div>
        </Tooltip>
      </div>
      <div className={'pt-3 pb-10 space-y-3 flex-1 h-0 flex-shrink-0 overflow-y-auto'}>
        {!state().searching &&
          !state().searchResults.length &&
          !state().vectorResults.length &&
          state().keyword && (
            <div className={'text-center text-sm text-gray-400 px-5 w-full break-all'}>
              <span>
                {true ? '未找到相关内容' : 'No content found for'}{' '}
                <span className={'text-blue-500 inline'}>{state().keyword}</span>
              </span>
            </div>
          )}
        {state().vector && (
          <div className={'space-y-3'}>
            {state().vectorResults.map((s, i) => (
              <div key={i}>
                <div
                  className={
                    'flex justify-between items-center dark:text-gray-300 text-gray-700 text-sm cursor-pointer select-none'
                  }
                  onClick={() => {
                    if (state().foldIndex.includes(i)) {
                      setState({
                        foldIndex: state().foldIndex.filter((index) => index !== i)
                      })
                    } else {
                      setState({ foldIndex: [...state().foldIndex, i] })
                    }
                  }}
                >
                  <div className={'flex flex-1 w-0 items-center'}>
                    <div className={'p-1'}>
                      <ChevronRight
                        size={14}
                        strokeWidth={3}
                        className={`cursor-pointer duration-200 dark:text-gray-500 text-gray-400 ${
                          state().foldIndex.includes(i) ? '' : 'rotate-90'
                        }`}
                      />
                    </div>
                    <div className={'flex-1 w-full truncate'}>{s.doc.name}</div>
                  </div>
                  <span className={'ml-2 dark:text-gray-500 pr-1 text-gray-600'}>
                    {s.results.length}
                  </span>
                </div>
                {!state().foldIndex.includes(i) && (
                  <div
                    className={
                      'space-y-2 text-xs dark:text-white/80 text-black/80 rounded py-2 px-2 dark:bg-black/30 bg-gray-300/20 mt-1'
                    }
                  >
                    {s.results.slice(0, 50).map((r, j) => (
                      <div className={'rounded-sm p-1 dark:bg-white/5 bg-gray-300/50'}>
                        <div
                          key={j}
                          onClick={() => {
                            toPath(s.doc.id, r.path)
                          }}
                          title={r.text}
                          className={
                            'cursor-pointer dark:hover:text-white hover:text-black group line-clamp-5'
                          }
                        >
                          {r.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!state().vector && (
          <div className={'space-y-3'}>
            {state().searchResults.map((s, i) => (
              <div key={i}>
                <div
                  className={
                    'flex justify-between items-center dark:text-gray-300 text-gray-700 text-sm cursor-pointer select-none'
                  }
                  onClick={() => {
                    if (state().foldIndex.includes(i)) {
                      setState({
                        foldIndex: state().foldIndex.filter((index) => index !== i)
                      })
                    } else {
                      setState({ foldIndex: [...state().foldIndex, i] })
                    }
                  }}
                >
                  <div className={'flex flex-1 w-0 items-center'}>
                    <div className={'p-1'}>
                      <ChevronRight
                        size={14}
                        strokeWidth={3}
                        className={`cursor-pointer duration-200 dark:text-gray-500 text-gray-400 ${
                          state().foldIndex.includes(i) ? '' : 'rotate-90'
                        }`}
                      />
                    </div>
                    <div className={'flex-1 w-full truncate'}>{s.doc.name}</div>
                  </div>
                  <span className={'ml-2 dark:text-gray-500 pr-1 text-gray-600'}>
                    {s.results.length}
                  </span>
                </div>
                {!state().foldIndex.includes(i) && (
                  <div
                    className={
                      'space-y-2 text-xs dark:text-white/80 text-black/80 rounded py-2 px-3 dark:bg-black/30 bg-gray-300/40 mt-1'
                    }
                  >
                    {s.results.slice(0, 50).map((r, j) => (
                      <div
                        key={j}
                        onClick={() => toNode({ el: r.el, doc: s.doc, codeLine: r.codeLine })}
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
        )}
      </div>
    </div>
  )
})
