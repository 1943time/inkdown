import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {Button, Space, Tooltip} from 'antd'
import {configStore} from '../../store/config'
import IClose from '../../icons/IClose'
import isHotkey from 'is-hotkey'
import {treeStore} from '../../store/tree'
import Replace from '../../icons/Replace'
import {ArrowRightOutlined, DownOutlined, UpOutlined} from '@ant-design/icons'
import {useLocalState} from '../../hooks/useLocalState'
import {Editor, Element, Transforms} from 'slate'
import {runInAction} from 'mobx'

export const Search = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    replaceText: '',
    openReplace: false
  })
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() =>
      inputRef.current?.focus()
    )
  }, [store.openSearch, store.focusSearch])
  const top = useMemo(() => {
    let pt = 40
    if (treeStore.tabs.length > 1) pt += 32
    return pt
  }, [treeStore.tabs.length])

  const replace = useCallback(() => {
    if (!store.highlightCache.size) {
      store.matchSearch(true)
    } else {
      const range = store.searchRanges[store.search.currentIndex]
      if (range) {
        const node = Editor.node(store.editor, range.anchor.path)
        const text = node[0]?.text as string
        if (text) {
          Transforms.insertText(store.editor, state.replaceText, {
            at: range
          })
          store.matchSearch(true)
        }
      }
    }
  }, [])

  const replaceAll = useCallback(() => {
    if (!store.search.text) return
    if (!store.highlightCache.size) {
      store.matchSearch(true)
    } else {
      const nodes = Array.from(Editor.nodes<any>(store.editor, {
        at: [],
        match: n => Element.isElement(n) && ['paragraph', 'table-cell', 'code-line', 'head'].includes(n.type),
      }))
      for (let n of nodes) {
        for (let i = 0; i < n[0].children.length; i++) {
          const text = n[0].children[i]?.text as string
          if (text && text.includes(store.search.text)) {
            Transforms.insertText(store.editor, text.replaceAll(store.search.text, state.replaceText), {
              at: {
                anchor: {path: [...n[1], i], offset: 0},
                focus: {path: [...n[1], i], offset: text.length}
              }
            })
          }
        }
      }
      store.highlightCache.clear()
      store.searchRanges = []
      runInAction(() => store.refreshHighlight = !store.refreshHighlight)
    }
  }, [])
  useEffect(() => {
  }, [store.refreshHighlight])
  return (
    <div
      className={`absolute w-full duration-200 left-0 items-center z-30 def-bg overflow-hidden border-b b1 ${store.openSearch ? '' : 'hidden'}`}
      style={{top}}
    >
      <div className={`mx-auto ${state.openReplace ? 'max-w-[900px]' : 'max-w-[700px]'} overflow-x-auto`}>
        <div
          className={'flex items-center py-2 h-[45px] justify-between px-14 min-w-[650px]'}
        >
          <div className={'flex-1 flex items-center'}>
            <div className={'flex-1 relative'}>
              <input
                value={store.search.text}
                placeholder={'Find'}
                autoFocus={true}
                ref={inputRef}
                onFocus={() => {
                  store.matchSearch(false)
                }}
                onKeyDown={e => {
                  if (isHotkey('enter', e)) {
                    store.nextSearch()
                  }
                }}
                className={'w-full input pr-8'}
                onChange={e => store.setSearchText(e.target.value)}
              />
              <Tooltip title={'Use Enter key to switch to the next search result'} mouseEnterDelay={1}>
                <div
                  className={`absolute right-1 top-1/2 -mt-[10px] p-0.5 rounded-sm cursor-pointer ${state.openReplace ? 'bg-black/10' : ''}`}
                  onClick={() => setState({openReplace: !state.openReplace})}
                >
                  <Replace className={'w-4 h-4'}/>
                </div>
              </Tooltip>
            </div>
            {state.openReplace &&
              <div className={'flex-1 flex items-center'}>
                <ArrowRightOutlined className={'px-2 text-sm text-gray-500 dark:text-gray-300'}/>
                <input
                  value={state.replaceText}
                  placeholder={'Replace'}
                  className={'w-full input'}
                  onChange={e => setState({replaceText: e.target.value})}
                />
              </div>
            }
          </div>
          <div className={`${state.openReplace ? 'ml-2' : 'ml-4'} flex justify-end dark:text-gray-400 text-gray-500 items-center select-none`}>
            <div className={'space-x-3 text-[13px] leading-5 flex items-center mr-2'}>
              {!state.openReplace &&
                <>
                  <div
                    className={'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'}
                    onClick={() => store.prevSearch()}
                  >
                    {'Prev'}
                  </div>
                  <div
                    className={'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'}
                    onClick={() => store.nextSearch()}
                  >
                    {'Next'}
                  </div>
                </>
              }
              {state.openReplace &&
                <>
                  <div className={'flex space-x-2'}>
                    <div
                      className={'flex items-center justify-center w-5 h-5 border border-gray-300 rounded cursor-pointer'}
                      onClick={() => store.prevSearch()}
                    >
                      <UpOutlined />
                    </div>
                    <div
                      className={'flex items-center justify-center w-5 h-5 border border-gray-300 rounded cursor-pointer'}
                      onClick={() => store.nextSearch()}
                    >
                      <DownOutlined />
                    </div>
                  </div>
                  <div
                    className={'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'}
                    onClick={replace}
                  >
                    {'Replace'}
                  </div>
                  <div
                    className={'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'}
                    onClick={replaceAll}
                  >
                    {'Replace All'}
                  </div>
                </>
              }
            </div>
            <div className={'w-16 text-right'}>
              {!!store.searchRanges.length &&
                <div className={'space-x-0.5 text-sm'}>
                  <span>{store.search.currentIndex + 1}</span>
                  <span>/</span>
                  <span>{store.searchRanges.length}</span>
                </div>
              }
              {!store.searchRanges.length && !!store.search.text &&
                <div className={'text-gray-500 text-sm'}>
                  {'No result'}
                </div>
              }
            </div>
          </div>
          <div className={'ml-5'}>
            <Tooltip placement="bottom" title={'Esc'} mouseEnterDelay={.5}>
              <div
                className={'p-0.5 rounded duration-200 dark:text-gray-400 dark:hover:text-gray-300 text-gray-500 hover:text-gray-600 hover:bg-black/5 dark:hover:bg-white/5'}
                onClick={() => {
                  store.setOpenSearch(false)
                }}
              >
                <IClose className={'w-5 h-5'}/>
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
})
