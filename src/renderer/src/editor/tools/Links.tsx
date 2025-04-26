import { useLocalState } from '@/hooks/useLocalState'
import { useTab } from '@/store/note/TabCtx'
import isHotkey from 'is-hotkey'
import { FileText, Heading1, Heading2, Heading3, Heading4, Heading5, X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { Editor, Element, Node, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'

const headIcon = new Map<number, React.ReactNode>([
  [1, <Heading1 size={16} />],
  [2, <Heading2 size={16} />],
  [3, <Heading3 size={16} />],
  [4, <Heading4 size={16} />],
  [5, <Heading5 size={16} />]
])
export const ChooseLink = observer(() => {
  const tab = useTab()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    nodes: [] as { folder: string[]; name: string; fullPath: string }[],
    filterNodes: [] as { folder: string[]; name: string; fullPath: string }[],
    showAnchor: false,
    keyword: '',
    index: 0,
    anchors: [] as { title: string; level: number }[],
    filterAnchors: [] as { title: string; level: number }[]
  })
  const insert = useCallback((complete = false) => {
    const [node] = Editor.nodes(tab.editor, {
      match: (n) => Element.isElement(n) && n.type === 'wiki-link',
      mode: 'lowest'
    })
    if (node) {
      if (state.showAnchor) {
        const anchor = state.filterAnchors[state.index]
        if (anchor) {
          const match = EditorUtils.parseWikiLink(tab.state.wikilink.keyword)
          Transforms.insertText(tab.editor, (match?.docName || '') + '#' + anchor.title, {
            at: {
              anchor: Editor.start(tab.editor, node[1]),
              focus: Editor.end(tab.editor, node[1])
            }
          })
        }
      } else {
        const doc = state.filterNodes[state.index]
        if (doc) {
          const duplicate = state.nodes.find(
            (n) => n.name === doc.name && n.fullPath !== doc.fullPath
          )
          Transforms.insertText(tab.editor, duplicate ? doc.fullPath : doc.name, {
            at: {
              anchor: Editor.start(tab.editor, node[1]),
              focus: Editor.end(tab.editor, node[1])
            }
          })
        }
      }
      if (!complete) {
        EditorUtils.moveAfterSpace(tab.editor, node[1])
      }
    }
  }, [])

  const keydown = useCallback((e: KeyboardEvent) => {
    if (isHotkey('up', e)) {
      if (state.showAnchor) {
        setState({ index: state.index - 1 < 0 ? state.filterAnchors.length - 1 : state.index - 1 })
      } else {
        setState({ index: state.index - 1 < 0 ? state.filterNodes.length - 1 : state.index - 1 })
      }
    }
    if (isHotkey('down', e)) {
      if (state.showAnchor) {
        setState({ index: state.index + 1 < state.filterAnchors.length ? state.index + 1 : 0 })
      } else {
        setState({ index: state.index + 1 < state.filterNodes.length ? state.index + 1 : 0 })
      }
    }
    if (isHotkey('tab', e)) {
      e.preventDefault()
      insert(true)
    }
    if (isHotkey('enter', e)) {
      e.preventDefault()
      insert()
    }
  }, [])
  useEffect(() => {
    if (tab.state.wikilink.open) {
      ;(async () => {
        const anchorIndex = tab.state.wikilink.keyword.indexOf('#')
        const showAnchor = anchorIndex !== -1 && tab.state.wikilink.offset >= anchorIndex
        let filterKeyword = tab.state.wikilink.keyword
          .slice(0, tab.state.wikilink.offset)
          .toLowerCase()
        if (showAnchor) {
          const match = EditorUtils.parseWikiLink(tab.state.wikilink.keyword)
          const doc = tab.store.note.getWikiDoc(match?.docName || '')
          if (doc) {
            if (!doc.schema) {
              const data = await tab.store.model.getDoc(doc.id)
              if (data) {
                doc.schema = data.schema
              }
            }
            filterKeyword = tab.state.wikilink.keyword
              .slice(anchorIndex + 1, tab.state.wikilink.offset)
              .toLowerCase()
            const anchors = (doc.schema || [])
              .filter((item) => item.type === 'head' && Node.string(item))
              .map((item) => {
                return { title: Node.string(item), level: item.level }
              })
            setState({
              anchors
            })
          } else {
            setState({
              anchors: [],
              filterAnchors: []
            })
          }
        }
        if (showAnchor) {
          setState({
            filterAnchors: state.anchors.filter((a) =>
              a.title.toLowerCase().includes(filterKeyword)
            ),
            index: 0
          })
        } else {
          setState({
            filterNodes: state.nodes.filter((n) => {
              return n.fullPath.toLowerCase().includes(filterKeyword)
            }),
            index: 0,
            filterAnchors: []
          })
        }
        setState({ showAnchor })
      })()
    }
  }, [tab.state.wikilink.keyword, tab.state.wikilink.offset])
  useEffect(() => {
    if (tab.state.wikilink.open) {
      const docs = Object.values(tab.store.note.state.nodes)
        .filter((item) => !item.folder && item.id !== tab.state.doc?.id)
        .map((item) => {
          const path = tab.store.note.getDocPath(item)
          return {
            folder: path.length > 1 ? path.slice(0, -1) : [],
            name: path[path.length - 1],
            fullPath: path.join('/')
          }
        })
      setState({
        nodes: docs,
        filterNodes: docs,
        anchors: []
      })
      window.addEventListener('keydown', keydown)
      return () => {
        window.removeEventListener('keydown', keydown)
      }
    }
  }, [tab.state.wikilink.open])
  useEffect(() => {
    tab.setState((state) => {
      state.wikilink.open = false
    })
  }, [tab.state.doc])
  if (!tab.state.wikilink.open) return null
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={'absolute z-30 w-[370px] ctx-panel flex flex-col'}
      style={{
        left: tab.state.wikilink.left,
        top: tab.state.wikilink.top,
        width: 390
      }}
    >
      <div
        className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}
        ref={scrollRef}
      >
        <>
          {!!state.showAnchor &&
            state.filterAnchors.map((a, i) => (
              <div
                key={i}
                onMouseEnter={(e) => {
                  setState({ index: i })
                }}
                onClick={() => insert()}
                className={`flex justify-between items-center py-0.5 rounded ${
                  state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                } cursor-pointer px-2`}
              >
                <div className={'flex-1 w-0 truncate'}>{a.title}</div>
                <div className={'ml-1'}>{headIcon.get(a.level)}</div>
              </div>
            ))}
          {!state.showAnchor &&
            state.filterNodes.map((f, i) => {
              return (
                <div
                  onClick={() => insert()}
                  key={i}
                  onMouseEnter={(e) => {
                    setState({ index: i })
                  }}
                  className={`flex justify-center py-0.5 rounded  cursor-pointer px-2 flex-col leading-4 ${state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''}`}
                >
                  <div
                    className={
                      'text-gray-600 dark:text-white/90 flex items-start leading-5 text-sm'
                    }
                  >
                    <div className={'h-5 flex items-center'}>
                      <FileText size={14} className={'dark:stroke-white/70 stroke-gray-500'} />
                    </div>
                    <span className={'ml-1 flex-1 max-w-full break-all w-0 text-sm'}>{f.name}</span>
                  </div>
                  {!!f.folder.length && (
                    <div
                      className={
                        'text-gray-500 dark:text-white/70 pl-[20px] break-all text-xs w-full truncate'
                      }
                    >
                      {f.folder.join('/')}
                    </div>
                  )}
                </div>
              )
            })}
          {((state.showAnchor && !state.filterAnchors.length) ||
            (!state.showAnchor && !state.filterNodes.length)) && (
            <div className={'py-4 text-center text-gray-400 text-sm'}>没有匹配的内容</div>
          )}
        </>
      </div>
      <div
        className={
          'flex items-center justify-between h-7 text-xs border-t dark:border-white/5 dark:text-white/60 px-3 text-black/60 border-black/5'
        }
      >
        <span>
          Type <span className={'font-bold mx-0.5'}>#</span> to link heading
        </span>
        <span className={''}>
          Type <span className={'font-bold mx-0.5'}>|</span> to change display text
        </span>
        <span className={'inline-flex items-center'}>
          <span className={'font-bold'}>esc</span>
          <X className={'ml-0.5 relative top-[0.5px]'} size={12} />
        </span>
      </div>
    </div>
  )
})
