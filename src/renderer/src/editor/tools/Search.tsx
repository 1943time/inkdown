import { useCallback, useEffect, useRef } from 'react'
import { Tooltip } from 'antd'
import isHotkey from 'is-hotkey'
import { ArrowRightOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import { Editor, Element, Node, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { Replace, X } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { TabStore } from '@/store/note/tab'
import { observer } from 'mobx-react-lite'

export const Search = observer(({ tab }: { tab: TabStore }) => {
  const [state, setState] = useGetSetState({
    replaceText: '',
    openReplace: false
  })
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus())
  }, [tab.state.openSearch, tab.state.focusSearch])

  const replace = useCallback(() => {
    if (!tab.state.search.searchRanges.length) {
      tab.matchSearch(true)
    } else {
      const cur = tab.state.search.searchRanges[tab.state.search.index]
      if (cur?.range) {
        const node = Editor.node(tab.editor, cur.range.anchor.path)
        const text = node[0]?.text as string
        if (text) {
          Transforms.insertText(tab.editor, state().replaceText, {
            at: cur.range
          })
        }
      } else if (cur.editorPath) {
        const code = tab.codeMap.get(cur.editorPath)
        if (code) {
          code.session.replace(cur.aceRange!, state().replaceText)
        }
      }
      tab.matchSearch(true)
    }
  }, [])

  const replaceAll = useCallback(() => {
    if (!tab.state.search.keyword) return
    const ranges = tab.state.search.searchRanges
    if (!ranges.length) {
      tab.matchSearch(true)
    } else {
      const nodes = Array.from(
        Editor.nodes<any>(tab.editor, {
          at: [],
          match: (n) => Element.isElement(n) && ['paragraph', 'table-cell', 'head'].includes(n.type)
        })
      )
      for (let n of nodes) {
        for (let i = 0; i < n[0].children.length; i++) {
          const text = n[0].children[i]?.text as string
          if (text && text.includes(tab.state.search.keyword)) {
            Transforms.insertText(
              tab.editor,
              text.replaceAll(tab.state.search.keyword, tab.state.search.replaceText),
              {
                at: {
                  anchor: { path: [...n[1], i], offset: 0 },
                  focus: { path: [...n[1], i], offset: text.length }
                }
              }
            )
          }
        }
      }
      for (const item of ranges) {
        if (item.editorPath) {
          const el = Node.get(tab.editor, item.editorPath)
          const code = tab.codeMap.get(el)
          if (code) {
            code.session.replace(item.aceRange!, tab.state.search.replaceText)
            EditorUtils.clearAceMarkers(code)
          }
        }
      }
      tab.highlightCache.clear()
      tab.setState((state) => {
        state.search.searchRanges = []
        state.search.index = 0
      })
    }
  }, [])
  if (!tab.state.openSearch) return null
  return (
    <div className={`items-center z-30 def-bg overflow-hidden`}>
      <div
        className={`mx-auto ${tab.state.openReplace ? 'max-w-[900px]' : 'max-w-[700px]'} overflow-x-auto`}
      >
        <div className={'flex items-center py-2 h-[45px] justify-between px-14 min-w-[650px]'}>
          <div className={'flex-1 flex items-center'}>
            <div className={'flex-1 relative'}>
              <input
                value={tab.state.search.keyword}
                placeholder={'查找'}
                autoFocus={true}
                ref={inputRef}
                onFocus={() => {
                  tab.matchSearch(false)
                }}
                onKeyDown={(e) => {
                  if (isHotkey('enter', e)) {
                    tab.nextSearch()
                  }
                }}
                className={'w-full input pr-8 pl-2'}
                onChange={(e) => tab.setSearchText(e.target.value)}
              />
              <div
                className={`absolute right-1 top-1/2 -mt-[10px] p-0.5 rounded-sm cursor-pointer ${tab.state.openReplace ? 'bg-black/10 dark:bg-white/20' : ''}`}
                onClick={() => setState({ openReplace: !tab.state.openReplace })}
              >
                <Replace className={'w-4 h-4 dark:text-gray-200 text-gray-700'} />
              </div>
            </div>
            {tab.state.openReplace && (
              <div className={'flex-1 flex items-center'}>
                <ArrowRightOutlined className={'px-2 text-sm text-gray-500 dark:text-gray-300'} />
                <input
                  value={tab.state.search.replaceText}
                  placeholder={'替换'}
                  className={'w-full input px-2'}
                  onChange={(e) => setState({ replaceText: e.target.value })}
                />
              </div>
            )}
          </div>
          <div
            className={`${tab.state.openReplace ? 'ml-2' : 'ml-4'} flex justify-end dark:text-gray-400 text-gray-500 items-center select-none`}
          >
            <div className={'space-x-3 text-[13px] leading-5 flex items-center mr-2'}>
              {!tab.state.openReplace && (
                <>
                  <div
                    className={
                      'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'
                    }
                    onClick={() => tab.prevSearch()}
                  >
                    {'上一个'}
                  </div>
                  <div
                    className={
                      'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'
                    }
                    onClick={() => tab.nextSearch()}
                  >
                    {'下一个'}
                  </div>
                </>
              )}
              {tab.state.openReplace && (
                <>
                  <div className={'flex space-x-2'}>
                    <div
                      className={
                        'flex items-center justify-center w-5 h-5 border border-gray-300 dark:border-gray-500 rounded cursor-pointer hover:text-gray-600 dark:hover:text-gray-300'
                      }
                      onClick={() => tab.prevSearch()}
                    >
                      <UpOutlined />
                    </div>
                    <div
                      className={
                        'flex items-center justify-center w-5 h-5 border border-gray-300 dark:border-gray-500 rounded cursor-pointer hover:text-gray-600 dark:hover:text-gray-300'
                      }
                      onClick={() => tab.nextSearch()}
                    >
                      <DownOutlined />
                    </div>
                  </div>
                  <div
                    className={
                      'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'
                    }
                    onClick={replace}
                  >
                    {'替换'}
                  </div>
                  <div
                    className={
                      'dark:bg-zinc-700/30 px-2 py-0.5 rounded cursor-pointer border dark:border-zinc-700 border-gray-500/50 hover:text-gray-600 dark:hover:text-gray-300 duration-100'
                    }
                    onClick={replaceAll}
                  >
                    {'替换所有'}
                  </div>
                </>
              )}
            </div>
            <div className={'w-16 text-right'}>
              {!!tab.state.search.searchRanges.length && (
                <div className={'space-x-0.5 text-sm'}>
                  <span>{tab.state.search.index + 1}</span>
                  <span>/</span>
                  <span>{tab.state.search.searchRanges.length}</span>
                </div>
              )}
              {!tab.state.search.searchRanges.length && !!tab.state.search.keyword && (
                <div className={'text-gray-500 text-sm'}>{'没有结果'}</div>
              )}
            </div>
          </div>
          <div className={'ml-5'}>
            <Tooltip placement="bottom" title={'Esc'} mouseEnterDelay={0.5}>
              <div
                className={
                  'p-0.5 rounded duration-200 dark:text-gray-400 dark:hover:text-gray-300 text-gray-500 hover:text-gray-600 hover:bg-black/5 dark:hover:bg-white/5'
                }
                onClick={() => {
                  tab.setOpenSearch(false)
                }}
              >
                <X className={'w-5 h-5'} />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
})
