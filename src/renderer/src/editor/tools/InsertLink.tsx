import { observer } from 'mobx-react-lite'
import { ReactNode, useCallback, useEffect, useRef } from 'react'
import { Node, Selection, Text, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { createPortal } from 'react-dom'
import isHotkey from 'is-hotkey'
import { Tooltip } from 'antd'
import { ISort } from '../../icons/keyboard/ISort'
import { useTab } from '@/store/note/TabCtx'
import { FileText, FolderClosed, Trash2, X } from 'lucide-react'
import { IPlanet } from '../icons/IPlanet'
import { isLink, parsePath } from '../utils'
import { IDoc } from 'types/model'
import { useLocalState } from '@/hooks/useLocalState'
import { useTranslation } from 'react-i18next'

type ShowDoc = { doc: IDoc; path: string }
type ShowAnchor = { doc: IDoc; path: string; value: string }
const width = 380
export const InsertLink = observer(() => {
  const tab = useTab()
  const { t } = useTranslation()
  const selRef = useRef<Selection>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const docMap = useRef(new Map<string, IDoc>())
  const [state, setState] = useLocalState({
    open: false,
    left: 0,
    y: 0,
    mode: 'top',
    inputKeyword: '',
    selectDocId: '',
    index: 0,
    docs: [] as ShowDoc[],
    filterDocs: [] as ShowDoc[],
    anchors: [] as ShowAnchor[],
    filterAnchors: [] as ShowAnchor[]
  })

  const getAnchors = useCallback(async (item: IDoc) => {
    let schema = item.schema
    if (!schema) {
      schema = (await tab.store.model.getDoc(item.id))?.schema
    }
    return (item.schema || [])
      .filter((e) => e.type === 'head')
      .map((e) => {
        let text = Node.string(e)
        return { doc: item, value: text, path: tab.note.getDocPath(item).join('/') }
      })
  }, [])

  const setAnchors = useCallback(async () => {
    if (isLink(state.inputKeyword) || !state.selectDocId) return setState({ anchors: [] })
    const parse = parsePath(state.inputKeyword)
    if (state.selectDocId === tab.store.note.state.opendDoc?.id) {
      const item = tab.note.state.opendDoc
      if (item) {
        const anchors = await getAnchors({
          ...item
        })
        setState({
          anchors,
          filterAnchors: parse.hash ? anchors.filter((a) => a.value.includes(parse.hash)) : anchors
        })
        scrollRef.current?.scrollTo({ top: 0 })
      } else {
        setState({ anchors: [], filterAnchors: [] })
      }
      return
    } else {
      const item = tab.note.state.nodes[state.selectDocId]
      if (item) {
        const anchors = await getAnchors(item)
        setState({
          anchors,
          filterAnchors: parse.hash ? anchors.filter((a) => a.value.includes(parse.hash)) : anchors
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

  const keydown = useCallback((e: KeyboardEvent) => {
    if (isHotkey('esc', e)) {
      close()
    }
    if (isHotkey('tab', e) && !isLink(state.inputKeyword)) {
      if (state.filterAnchors.length) {
        const target = state.filterAnchors[state.index]
        if (target) {
          e.preventDefault()
          setState({
            inputKeyword: target.path + '#' + target.value
          })
        }
      } else {
        const target = state.filterDocs[state.index]
        if (target) {
          e.preventDefault()
          setState({ inputKeyword: target.path })
        }
      }
    }
    if (isHotkey('up', e)) {
      e.preventDefault()
      if ((state.filterDocs.length || state.filterAnchors.length) && state.index > 0) {
        setState({
          index: state.index - 1
        })
      }
    }
    if (isHotkey('down', e)) {
      e.preventDefault()
      if (state.anchors.length) {
        if (state.index < state.filterAnchors.length - 1) {
          setState({
            index: state.index + 1
          })
        }
      } else if (state.index < state.filterDocs.length - 1) {
        setState({
          index: state.index + 1
        })
      }
    }
    if (isHotkey('enter', e)) {
      e.preventDefault()
      if (isLink(state.inputKeyword)) {
        close({ url: state.inputKeyword, docId: undefined, hash: undefined })
      } else {
        if (state.anchors.length) {
          const target = state.filterAnchors[state.index]
          if (target) {
            close({
              url: undefined,
              docId:
                target.doc.id === tab.store.note.state.opendDoc?.id ? undefined : target.doc.id,
              hash: target.value
            })
          } else {
            close({
              url: state.inputKeyword,
              docId: undefined,
              hash: undefined
            })
          }
        } else {
          const target = state.filterDocs[state.index]
          if (target) {
            close({ url: undefined, docId: target.doc.id, hash: undefined })
          } else {
            close({ url: state.inputKeyword, docId: undefined, hash: undefined })
          }
        }
      }
    }
    const target = scrollRef.current?.children[state.index] as HTMLDivElement
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

  useEffect(() => {
    if (tab.state.domRect && tab.state.openInsertLink) {
      const domRect = tab.state.domRect
      selRef.current = tab.editor.selection
      tab.container!.parentElement?.addEventListener('wheel', prevent, {
        passive: false
      })
      const mode = window.innerHeight - domRect.top - domRect.height < 260 ? 'bottom' : 'top'
      let y =
        mode === 'bottom' ? window.innerHeight - domRect.top + 5 : domRect.top + domRect.height + 5
      let left = domRect.x
      left = left - (width - domRect.width) / 2
      if (left > window.innerWidth - width) left = window.innerWidth - width - 4
      if (left < 4) left = 4
      if (left + width > window.innerWidth - 4) {
        left = window.innerWidth - 4 - width
      }
      const notes = Object.values(tab.note.state.nodes)
        .filter((t) => t.id !== tab.store.note.state.opendDoc?.id && t.id !== 'root')
        .map((t) => {
          const path = tab.note.getDocPath(t).join('/')
          docMap.current.set(path, t)
          return { doc: t, path }
        })
      let filterNotes = notes
      const leaf = EditorUtils.getLink(tab.editor)
      let path = leaf?.url || ''
      if (leaf?.docId) {
        const target = tab.note.state.nodes[leaf.docId]
        if (target) {
          path = tab.note.getDocPath(target).join('/')
          filterNotes = [{ doc: target, path: tab.note.getDocPath(target).join('/') }]
          setState({ selectDocId: leaf.docId })
        }
      }
      if (leaf?.hash) {
        path += `#${leaf.hash}`
        if (!leaf.docId) {
          setState({ selectDocId: tab.store.note.state.opendDoc?.id || '' })
        }
        setState({ inputKeyword: path })
        setAnchors()
      } else {
        setState({ anchors: [] })
      }
      if (!path && leaf?.docId) {
        path = 'not found'
        filterNotes = []
      }
      setState({
        left,
        y,
        mode,
        open: true,
        filterDocs: filterNotes,
        docs: notes,
        inputKeyword: path
      })
      setTimeout(() => {
        inputRef.current?.focus()
      }, 16)
      window.addEventListener('keydown', keydown)
    } else {
      setState({
        open: false
      })
    }
  }, [tab.state.openInsertLink])

  const close = useCallback(
    (data?: { url?: string; docId?: string; hash?: string } | null) => {
      tab.container?.parentElement?.removeEventListener('wheel', prevent)
      setState({ open: false })
      Transforms.select(tab.editor, selRef.current!)
      EditorUtils.focus(tab.editor)
      if (data === null) {
        Transforms.setNodes(
          tab.editor,
          { url: undefined, docId: undefined, hash: undefined },
          { match: Text.isText, split: true }
        )
      }
      if (data) {
        Transforms.setNodes(tab.editor, { ...data }, { match: Text.isText, split: true })
      }
      window.removeEventListener('keydown', keydown)
      tab.setState((state) => {
        state.openInsertLink = false
      })
    },
    [tab]
  )
  if (!state.open) return null
  return createPortal(
    <div className={'fixed z-[100] inset-0'} onClick={() => close()}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={'absolute z-30 w-[370px] ctx-panel pt-3 flex flex-col'}
        style={{
          left: state.left,
          top: state.mode === 'top' ? state.y : undefined,
          bottom: state.mode === 'bottom' ? state.y : undefined
        }}
      >
        <div className={'px-3 flex items-center'}>
          <input
            ref={inputRef}
            value={state.inputKeyword}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === '#') {
                if (!state.inputKeyword) {
                  setState({
                    selectDocId: tab.store.note.state.opendDoc?.id || ''
                  })
                } else {
                  const p = parsePath(state.inputKeyword)
                  setState({
                    selectDocId: docMap.current.get(p.path)?.id || ''
                  })
                }
                setAnchors()
              }
              if (
                e.key.toLowerCase() === 'backspace' &&
                state.anchors.length &&
                (e.metaKey ||
                  e.altKey ||
                  state.inputKeyword.endsWith('#') ||
                  !state.inputKeyword.includes('#'))
              ) {
                setState({
                  anchors: [],
                  filterAnchors: [],
                  selectDocId: ''
                })
              }
            }}
            onChange={(e) => {
              const key = e.target.value.toLowerCase()
              if (state.anchors.length) {
                const parse = parsePath(key)
                const filterAnchors = state.anchors.filter((d) => {
                  return !parse.hash || d.value.toLowerCase().includes(parse.hash)
                })
                setState({
                  filterAnchors
                })
              } else {
                const filterDocs = state.docs.filter((d) => {
                  return d.path!.toLowerCase().includes(key)
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
            placeholder={t('editor.insertLink.placeholder')}
            className={`flex-1 text-sm border rounded dark:border-gray-200/30 border-gray-300 h-8 px-2 outline-none bg-zinc-100 dark:bg-black/30`}
          />
          <Tooltip title={t('editor.insertLink.removeLink')} mouseEnterDelay={0.5}>
            <div
              className={
                'p-1 text-base rounded ml-1 hover:bg-gray-200/70 cursor-pointer dark:hover:bg-gray-100/10 text-gray-600 dark:text-gray-300'
              }
              onClick={() => {
                close(null)
              }}
            >
              <Trash2 size={16} />
            </div>
          </Tooltip>
        </div>
        <div
          className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}
          ref={scrollRef}
        >
          {isLink(state.inputKeyword) && !!state.inputKeyword ? (
            <>
              <div
                onClick={(e) => {
                  close({ url: state.inputKeyword })
                }}
                className={`flex justify-center py-1.5 rounded bg-gray-200/70 dark:bg-gray-100/10 cursor-pointer px-2 flex-col`}
              >
                <div className={'text-gray-600 dark:text-gray-300 flex'}>
                  <IPlanet className={'flex-shrink-0 h-5'} />
                  <span className={'ml-1 flex-1 max-w-full text-sm break-all'}>
                    {state.inputKeyword}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {!!state.anchors.length &&
                state.filterAnchors.map((a, i) => (
                  <div
                    key={i}
                    onMouseEnter={(e) => {
                      setState({ index: i })
                    }}
                    onClick={(e) => {
                      close({
                        docId:
                          a.doc.id === tab.store.note.state.opendDoc?.id ? undefined : a.doc.id,
                        hash: a.value
                      })
                    }}
                    className={`flex justify-center py-0.5 rounded ${
                      state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                    } cursor-pointer px-2 flex-col`}
                  >
                    <div
                      className={
                        'text-gray-600 dark:text-gray-300 stroke-gray-600 dark:stroke-gray-300 flex items-start leading-6'
                      }
                    >
                      <div className={'h-6 flex items-center'}>
                        <FileText size={14} />
                      </div>
                      <span className={'ml-1 flex-1 max-w-full break-all text-sm'}>
                        {a.doc.id === tab.store.note.state.opendDoc?.id ? '' : a.doc.name}#{a.value}
                      </span>
                    </div>
                    {!!a.doc.parentId && a.doc.parentId !== 'root' && (
                      <div
                        className={
                          'text-gray-500 dark:text-gray-400 text-sm pl-[18px] break-all text-[13px]'
                        }
                      >
                        {a.path?.split('/').slice(0, -1).join('/')}
                      </div>
                    )}
                  </div>
                ))}
              {!state.anchors.length &&
                state.filterDocs.map((f, i) => {
                  return (
                    <div
                      key={f.doc.id}
                      onMouseEnter={(e) => {
                        setState({ index: i })
                      }}
                      onClick={(e) => {
                        close({ docId: f.doc.id })
                      }}
                      className={`flex justify-center py-0.5 rounded ${
                        state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                      } cursor-pointer px-2 flex-col ${f.doc.id === tab.store.note.state.opendDoc?.id ? 'hidden' : ''}`}
                    >
                      <div
                        className={
                          'text-gray-600 dark:text-white/90 stroke-gray-600 dark:stroke-white/90 flex items-start leading-6 text-sm'
                        }
                      >
                        <div className={'h-6 flex items-center'}>
                          {f.doc.folder ? <FolderClosed size={14} /> : <FileText size={14} />}
                        </div>
                        <span className={'ml-1 flex-1 max-w-full break-all'}>{f.doc.name}</span>
                      </div>
                      {!!f.doc.parentId && f.doc.parentId !== 'root' && (
                        <div
                          className={
                            'text-gray-500 dark:text-white/70 pl-[18px] break-all text-[13px]'
                          }
                        >
                          {f.path?.split('/').slice(0, -1).join('/')}
                        </div>
                      )}
                    </div>
                  )
                })}
              {((!!state.anchors.length && !state.filterAnchors.length) ||
                (!!state.docs.length && !state.filterDocs.length) ||
                (!state.anchors.length && !state.docs.length)) && (
                <div className={'py-4 text-center text-gray-400 text-sm'}>
                  {t('editor.insertLink.noRelatedDocs')}
                </div>
              )}
            </>
          )}
        </div>
        <div
          className={
            'flex items-center justify-around h-7 leading-7 border-t dark:border-white/5 dark:text-white/60 px-3 text-black/60 border-black/5'
          }
        >
          <span className={'text-xs flex items-center'}>
            <ISort className={'mr-1'} />
            {t('editor.insertLink.navigate')}
          </span>
          <span className={'text-xs ml-2.5'}>
            <span className={'font-bold'}>tab</span> {t('editor.insertLink.complete')}
          </span>
          <span className={'text-xs ml-2.5'}>
            <span className={'font-bold'}>#</span> {t('editor.insertLink.linkHeading')}
          </span>
          <span className={'text-xs ml-2.5 flex items-center'}>
            <span className={'font-bold'}>esc</span>
            <X className={'ml-0.5 relative top-[0.5px]'} size={12} />
          </span>
        </div>
      </div>
    </div>,
    document.body
  ) as ReactNode
})
