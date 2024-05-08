import { observer } from 'mobx-react-lite'
import { useSubject } from '../../hooks/subscribe'
import { useEditorStore } from '../store'
import { useCallback, useRef } from 'react'
import { Node, Selection, Text, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { useGetSetState } from 'react-use'
import { IFileItem } from '../..'
import { treeStore } from '../../store/tree'
import { createPortal } from 'react-dom'
import INote from '../../icons/INote'
import INet from '../../icons/Net'
import isHotkey from 'is-hotkey'
import { runInAction } from 'mobx'
import { configStore } from '../../store/config'
import { join } from 'path'
import { isLink, parsePath, toRelativePath, toSpacePath } from '../../utils/path'
import { Icon } from '@iconify/react'
import { Tooltip } from 'antd'

type DocItem = IFileItem & { path: string; parentPath?: string }
const width = 350
export const InsertLink = observer(() => {
  const store = useEditorStore()
  const selRef = useRef<Selection>()
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const docMap = useRef(new Map<string, IFileItem & { path: string; parentPath?: string }>())
  const [state, setState] = useGetSetState({
    open: false,
    left: 0,
    y: 0,
    mode: 'top',
    inputKeyword: '',
    oldUrl: '',
    index: 0,
    docs: [] as DocItem[],
    filterDocs: [] as DocItem[],
    anchors: [] as { item: DocItem; value: string }[],
    filterAnchors: [] as { item: DocItem; value: string }[]
  })

  const getAnchors = useCallback((item: DocItem, path: string) => {
    return (item.schema || [])
      .filter((e) => e.type === 'head')
      .map((e) => {
        let text = Node.string(e)
        return { item, value: '#' + text }
      })
  }, [])

  const setAnchors = useCallback(() => {
    if (isLink(state().inputKeyword)) return setState({ anchors: [] })
    const parse = parsePath(state().inputKeyword)
    if (!parse.path) {
      const item = docMap.current.get(store.openFilePath!)
      if (item) {
        const anchors = getAnchors(item, item.path)
        setState({
          anchors,
          filterAnchors: parse.hash
            ? anchors.filter((a) => a.value.includes('#' + parse.hash))
            : anchors
        })
        scrollRef.current?.scrollTo({ top: 0 })
      } else {
        setState({ anchors: [], filterAnchors: [] })
      }
      return
    } else {
      const item = docMap.current.get(join(treeStore.root?.filePath || '', parse.path))
      if (item) {
        const anchors = getAnchors(item, item.path)
        setState({
          anchors,
          filterAnchors: parse.hash
            ? anchors.filter((a) => a.value.includes('#' + parse.hash))
            : anchors
        })
        scrollRef.current?.scrollTo({ top: 0 })
      } else {
        setState({ anchors: [], filterAnchors: [] })
      }
    }
  }, [])

  const prevent = useCallback((e: WheelEvent) => {
    e.preventDefault()
  }, [])

  const setPath = useCallback((path: string) => {
    if (isLink(path)) {
      close(path)
    } else {
      const parse = parsePath(path)
      if (!parse.path && parse.hash) {
        return close('#' + parse.hash)
      }
      const filePath = store.openFilePath || ''
      const realPath = join(treeStore.root?.filePath || '', parse.path)
      const relativePath = realPath === store.openFilePath ? '' : toRelativePath(filePath, realPath)
      close(`${relativePath}${parse.hash ? `#${parse.hash}` : ''}`)
    }
  }, [])

  const keydown = useCallback((e: KeyboardEvent) => {
    if (isHotkey('esc', e)) {
      close(state().oldUrl)
    }
    if (isHotkey('tab', e) && !isLink(state().inputKeyword)) {
      if (state().filterAnchors.length) {
        const target = state().filterAnchors[state().index]
        if (target) {
          e.preventDefault()
          setState({ inputKeyword: target.item.path + target.value })
        }
      } else {
        const target = state().filterDocs[state().index]
        if (target) {
          e.preventDefault()
          setState({ inputKeyword: target.path })
        }
      }
    }
    if (isHotkey('up', e)) {
      e.preventDefault()
      if ((state().filterDocs.length || state().filterAnchors.length) && state().index > 0) {
        setState({
          index: state().index - 1
        })
      }
    }
    if (isHotkey('down', e) ) {
      e.preventDefault()
      if (state().anchors.length) {
        if (state().index < state().filterAnchors.length - 1) {
          setState({
            index: state().index + 1
          })
        }
      } else if (state().index < state().filterDocs.length - 1) {
        setState({
          index: state().index + 1
        })
      }
    }
    if (isHotkey('enter', e)) {
      e.preventDefault()
      if (isLink(state().inputKeyword)) {
        close(state().inputKeyword)
      } else {
        if (state().anchors.length) {
          const target = state().filterAnchors[state().index]
          if (target) {
            setPath(target.item.path + target.value)
          }
        } else {
          const target = state().filterDocs[state().index]
          if (target) {
            setPath(target.path)
          }
        }
      }
    }
    const target = scrollRef.current?.children[state().index] as HTMLDivElement
    if (target) {
      const { scrollTop, clientHeight } = scrollRef.current!
      if (target.offsetTop > scrollTop + clientHeight - 50) {
        scrollRef.current!.scroll({
          top: target.offsetTop
        })
      }
      if (target.offsetTop < scrollTop) {
        scrollRef.current!.scroll({
          top: target.offsetTop - 150
        })
      }
    }
  }, [])

  useSubject(store.openInsertLink$, (sel) => {
    if (store.domRect) {
      selRef.current = sel
      store.container!.parentElement?.addEventListener('wheel', prevent, { passive: false })
      const mode =
        window.innerHeight - store.domRect.top - store.domRect.height < 230 ? 'bottom' : 'top'
      let y =
        mode === 'bottom'
          ? window.innerHeight - store.domRect.top + 5
          : store.domRect.top + store.domRect.height + 5
      let left = store.domRect.x
      left = left - (width - store.domRect.width) / 2
      if (left > window.innerWidth - width) left = window.innerWidth - width - 4
      const { docs, map } = treeStore.allNotes
      docMap.current = map
      const url = EditorUtils.getUrl(store.editor)
      let path = url
      if (url && !url.startsWith('#') && !isLink(url) && treeStore.root) {
        path = toSpacePath(treeStore.root.filePath, store.openFilePath || '', url)
      }
      const parse = parsePath(path)
      const filterDocs = parse.path ? docs.filter((f) => f.path.includes(parse.path)) : docs.slice()
      setState({
        left,
        y,
        oldUrl: url || '',
        mode,
        open: true,
        filterDocs: filterDocs,
        docs,
        inputKeyword: path
      })
      if (parse.hash) {
        setAnchors()
      } else {
        setState({
          filterAnchors: [],
          anchors: []
        })
      }
      setTimeout(() => {
        inputRef.current?.focus()
      }, 16)
      window.addEventListener('keydown', keydown)
    }
  })

  const close = useCallback((url?: string) => {
    store.container!.parentElement?.removeEventListener('wheel', prevent)
    setState({ open: false })
    Transforms.select(store.editor, selRef.current!)
    EditorUtils.focus(store.editor)
    Transforms.setNodes(store.editor, { url }, { match: Text.isText, split: true })
    window.removeEventListener('keydown', keydown)
    runInAction(() => {
      store.openLinkPanel = false
    })
  }, [])
  if (!state().open) return null
  return createPortal(
    <div className={'fixed z-[100] inset-0'} onClick={() => close(state().oldUrl)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={'absolute z-30 w-[350px] ctx-panel pt-3 flex flex-col'}
        style={{
          left: state().left,
          top: state().mode === 'top' ? state().y : undefined,
          bottom: state().mode === 'bottom' ? state().y : undefined
        }}
      >
        <div className={'px-3 flex items-center'}>
          <input
            ref={inputRef}
            value={state().inputKeyword}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === '#') {
                setAnchors()
              }
              if (
                e.key.toLowerCase() === 'backspace' &&
                state().anchors.length &&
                (e.metaKey ||
                  e.altKey ||
                  state().inputKeyword.endsWith('#') ||
                  !state().inputKeyword.includes('#'))
              ) {
                setState({
                  anchors: [],
                  filterAnchors: []
                })
              }
            }}
            onChange={(e) => {
              const key = e.target.value.toLowerCase()
              if (state().anchors.length) {
                const parse = parsePath(key)
                const filterAnchors = state().anchors.filter((d) => {
                  return !parse.hash || d.value.toLowerCase().includes(parse.hash)
                })
                setState({
                  filterAnchors
                })
              } else {
                const filterDocs = state().docs.filter((d) => {
                  return d.path.toLowerCase().includes(key)
                })
                setState({
                  filterDocs
                })
              }
              setState({
                inputKeyword: e.target.value,
                index: 0
              })
            }}
            placeholder={`${treeStore.root ? 'Url filepath #hash, tab key completion' : 'Link'}`}
            className={`flex-1 text-sm border rounded dark:border-gray-200/30 border-gray-300 h-7 px-2 outline-none bg-zinc-100 dark:bg-black/30`}
          />
          <Tooltip title={configStore.zh ? '移除链接' : 'Remove link'} mouseEnterDelay={.5}>
            <div
              className={'p-1 rounded ml-1 hover:bg-gray-200/70 cursor-pointer dark:hover:bg-gray-100/10 text-gray-600 dark:text-gray-300'}
              onClick={() => {
                close()
              }}
            >
              <Icon icon={'mi:delete'} />
            </div>
          </Tooltip>
        </div>
        <div
          className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}
          ref={scrollRef}
        >
          {isLink(state().inputKeyword) || (!treeStore.root && !!state().inputKeyword) ? (
            <>
              <div
                onClick={(e) => {
                  close(state().inputKeyword)
                }}
                className={`flex justify-center py-1.5 rounded bg-gray-200/70 dark:bg-gray-100/10 cursor-pointer px-2 flex-col`}
              >
                <div className={'text-gray-600 dark:text-gray-300 flex items-center'}>
                  <INet />
                  <span className={'ml-1 flex-1 max-w-full text-sm break-words'}>{state().inputKeyword}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {!!state().anchors.length &&
                state().filterAnchors.map((a, i) => (
                  <div
                    key={i}
                    onMouseEnter={(e) => {
                      setState({ index: i })
                    }}
                    onClick={(e) => {
                      setPath(a.item.path + a.value)
                    }}
                    className={`flex justify-center py-1 rounded ${
                      state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                    } cursor-pointer px-2 flex-col`}
                  >
                    <div className={'text-gray-600 dark:text-gray-300 flex items-center leading-6'}>
                      <INote />
                      <span className={'ml-1 flex-1 max-w-full truncate'}>
                        {a.item.filePath === store.openFilePath ? '' : a.item.filename + '.md'}
                        {a.value}
                      </span>
                    </div>
                    {!!a.item.parentPath && (
                      <div className={'text-gray-500 dark:text-gray-400 text-sm pl-[18px] truncate'}>
                        {a.item.parentPath}
                      </div>
                    )}
                  </div>
                ))}
              {!state().anchors.length &&
                state().filterDocs.map((f, i) => {
                  return (
                    <div
                      key={f.cid}
                      onMouseEnter={(e) => {
                        setState({ index: i })
                      }}
                      onClick={(e) => {
                        setPath(f.path)
                      }}
                      className={`flex justify-center py-1 rounded ${
                        state().index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                      } cursor-pointer px-2 flex-col ${f.filePath === store.openFilePath ? 'hidden' : ''}`}
                    >
                      <div className={'text-gray-600 dark:text-white/90 flex items-center leading-6'}>
                        <INote />
                        <span className={'ml-1 flex-1 max-w-full truncate'}>{f.filename}</span>
                      </div>
                      {!!f.parentPath && (
                        <div className={'text-gray-500 dark:text-white/70 text-sm pl-[18px] truncate'}>
                          {f.parentPath}
                        </div>
                      )}
                    </div>
                  )
                })}
              {((!!state().anchors.length && !state().filterAnchors.length) || (!!state().docs.length && !state().filterDocs.length)) && (
                <div className={'py-4 text-center text-gray-400'}>
                  {configStore.zh ? '没有相关文档' : 'No related documents'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
})
