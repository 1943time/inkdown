import {observer} from 'mobx-react-lite'
import {useGetSetState} from 'react-use'
import {useCallback, useEffect, useRef} from 'react'
import {IFileItem} from '../index'
import {treeStore} from '../store/tree'
import {Node} from 'slate'
import {ReactEditor} from 'slate-react'
import {configStore} from '../store/config'
import {SearchOutlined} from '@ant-design/icons'
import ArrowRight from '../icons/ArrowRight'

const visitSchema = (schema: any[], cb: (node: any) => void) => {
  for (let c of schema) {
    cb(c)
    if (c.children?.length) {
      visitSchema(c.children, cb)
    }
  }
}
export const FullSearch = observer(() => {
  const [state, setState] = useGetSetState({
    unfold: false,
    searchResults: [] as {
      file: IFileItem, results: { el: any, text: '' }[], fold?: boolean
    }[],
    foldIndex: [] as number[],
    searching: false
  })
  const dom = useRef<HTMLDivElement>(null)
  const toPoint = useCallback((target: HTMLElement) => {
    requestIdleCallback(() => {
      const top = treeStore.currentTab.store!.offsetTop(target)
      treeStore.currentTab.store!.container!.scroll({
        top: top - 100
      })
      target.classList.add('high-block')
      setTimeout(() => {
        target.classList.remove('high-block')
      }, 2000)
    })
  }, [])

  const toNode = useCallback((res: { el: any, file: IFileItem }) => {
    if (res.el) {
      if (treeStore.openedNote !== res.file) {
        treeStore.openNote(res.file, false)
        setTimeout(() => {
          requestIdleCallback(() => {
            try {
              const dom = ReactEditor.toDOMNode(treeStore.currentTab.store?.editor!, res.el)
              if (dom) toPoint(dom)
            } catch (e) {
              console.warn('dom not find', e)
            }
          })
        }, 200)
      } else {
        try {
          const dom = ReactEditor.toDOMNode(treeStore.currentTab.store?.editor!, res.el)
          if (dom) toPoint(dom)
        } catch (e) {
          console.warn('dom not find')
        }
      }
    } else {
      if (treeStore.openedNote !== res.file) {
        treeStore.openNote(res.file, false)
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
    setState({searching: true})
    timer.current = window.setTimeout(() => {
      if (!treeStore.searchKeyWord.trim() || !treeStore.nodes.length) {
        return setState({searchResults: []})
      }
      let results: any[] = []
      for (let f of treeStore.nodes) {
        let res: { file: IFileItem, results: { el: any, text: string }[] } | null = null
        let matchText = treeStore.searchKeyWord.toLowerCase()
        if (f.ext === 'md' && f.filename.toLowerCase().includes(matchText)) {
          if (!res) res = { file: f, results: [] }
          res.results.push({
            el: null,
            text: f.filename.toLowerCase().replaceAll(
              matchText,
              '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>'
            )
          })
        }
        if (f.schema) {
          visitSchema(f.schema, node => {
            if (['paragraph', 'table-cell', 'code-line', 'head'].includes(node.type)) {
              let str = Node.string(node)
              str = str.toLowerCase()
              if (str && str.includes(matchText)) {
                if (!res) res = {file: f, results: []}
                res.results.push({
                  el: node,
                  text: str.replaceAll(matchText, '<span class="text-indigo-500 dark:group-hover:text-indigo-400 group-hover:text-indigo-600">$&</span>')
                })
              }
            }
          })
        }
        if (res) results.push(res)
      }
      setState({searchResults: results, foldIndex: [], searching: false})
    }, immediate ? 0 : 300)
  }, [])
  useEffect(() => {
    if (treeStore.treeTab === 'search') {
      if (treeStore.searchKeyWord) {
        search()
      }
      dom.current?.querySelector('input')?.focus()
    }
  }, [treeStore.treeTab])
  return (
    <div className={'py-1 h-full'} ref={dom}>
      <div className={'px-4 relative'}>
        <SearchOutlined className={'absolute left-6 top-1/2 -translate-y-1/2 z-10 dark:text-gray-500 text-gray-400'}/>
        <input
          value={treeStore.searchKeyWord}
          autoFocus={true}
          className={'input h-8 w-full pl-7'}
          onChange={e => {
            treeStore.setState({searchKeyWord: e.target.value})
            search()
          }}
          placeholder={configStore.zh ? '搜索' : 'Search'}
        />
      </div>
      <div className={'py-3 px-5 space-y-3 h-[calc(100%_-_1.5rem)] overflow-y-auto'}>
        {!state().searching && !state().searchResults.length && treeStore.searchKeyWord &&
          <div className={'text-center text-sm text-gray-400 px-5 w-full break-all'}>
            <span>
              {configStore.zh ? '未找到相关内容' : 'No content found for'} <span className={'text-indigo-500 inline'}>{treeStore.searchKeyWord}</span>
            </span>
          </div>
        }
        <div className={'space-y-3'}>
          {state().searchResults.slice(0, 100).map((s, i) =>
            <div key={i}>
              <div
                className={'flex justify-between items-center dark:text-gray-300 text-gray-600 text-sm cursor-default select-none'}>
                <div className={'flex items-center'}>
                  <div
                    className={'p-1'}
                    onClick={() => {
                      if (state().foldIndex.includes(i)) {
                        setState({foldIndex: state().foldIndex.filter(index => index !== i)})
                      } else {
                        setState({foldIndex: [...state().foldIndex, i]})
                      }
                    }}
                  >
                    <ArrowRight
                      className={`w-3 h-3 duration-200 dark:text-gray-500 text-gray-400 ${state().foldIndex.includes(i) ? '' : 'rotate-90'}`}
                    />
                  </div>
                  <div className={'flex-1 w-full truncate'}>
                    {s.file.filename}
                  </div>
                </div>
                <span className={'ml-2 dark:text-gray-500 pr-1 text-gray-600'}>{s.results.length}</span>
              </div>
              {!state().foldIndex.includes(i) &&
                <div
                  className={'space-y-2 text-xs dark:text-gray-400 text-gray-600 rounded py-2 px-3 dark:bg-black/30 bg-gray-300/60 mt-1'}>
                  {s.results.slice(0, 100).map((r, j) =>
                    <div
                      key={j}
                      onClick={() => toNode({el: r.el, file: s.file})}
                      className={'cursor-default dark:hover:text-gray-200 hover:text-gray-800 group break-all ellipsis-10'}
                      dangerouslySetInnerHTML={{__html: r.text}}
                    />
                  )}
                </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
