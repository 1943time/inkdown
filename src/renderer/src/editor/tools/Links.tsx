import { useLocalState } from '@/hooks/useLocalState'
import { useTab } from '@/store/note/TabCtx'
import { FileText, Heading1, Heading2, Heading3, Heading4, Heading5, X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef } from 'react'
import { Editor, Element, Node, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { ScrollList } from '@/ui/common/ScrollList'

const headIcon = new Map<number, React.ReactNode>([
  [1, <Heading1 size={16} />],
  [2, <Heading2 size={16} />],
  [3, <Heading3 size={16} />],
  [4, <Heading4 size={16} />],
  [5, <Heading5 size={16} />]
])
export const ChooseWikiLink = observer(() => {
  const tab = useTab()
  const [state, setState] = useLocalState({
    nodes: [] as { folder: string[]; name: string; fullPath: string }[],
    filterNodes: [] as { folder: string[]; name: string; fullPath: string }[],
    showAnchor: false,
    anchors: [] as { title: string; level: number }[],
    filterAnchors: [] as { title: string; level: number }[]
  })
  const insert = useCallback(
    (ctx: {
      complete?: boolean
      anchor?: { title: string; level: number }
      node?: { folder: string[]; name: string; fullPath: string }
    }) => {
      const [node] = Editor.nodes(tab.editor, {
        match: (n) => Element.isElement(n) && n.type === 'wiki-link',
        mode: 'lowest'
      })
      if (node) {
        const ps = EditorUtils.parseWikiLink(Node.string(node[0]))
        if (state.showAnchor && ctx.anchor) {
          const anchor = ctx.anchor
          if (anchor) {
            Transforms.insertText(
              tab.editor,
              (ps?.docName || '') + '#' + anchor.title + (ps?.alias ? `|${ps.alias}` : ''),
              {
                at: {
                  anchor: Editor.start(tab.editor, node[1]),
                  focus: Editor.end(tab.editor, node[1])
                }
              }
            )
          }
        } else if (ctx.node) {
          const duplicate = state.nodes.find(
            (n) => n.name === ctx.node!.name && n.fullPath !== ctx.node!.fullPath
          )
          Transforms.insertText(
            tab.editor,
            (duplicate ? ctx.node!.fullPath : ctx.node!.name) +
              (ps?.anchor ? `#${ps.anchor}` : '') +
              (ps?.alias ? `|${ps.alias}` : ''),
            {
              at: {
                anchor: Editor.start(tab.editor, node[1]),
                focus: Editor.end(tab.editor, node[1])
              }
            }
          )
        }
        if (!ctx.complete) {
          EditorUtils.moveAfterSpace(tab.editor, node[1])
        }
      }
    },
    []
  )

  useEffect(() => {
    if (tab.state.wikilink.open) {
      ;(async () => {
        let filterKeyword = tab.state.wikilink.keyword
          .slice(0, tab.state.wikilink.offset)
          .toLowerCase()

        const anchorIndex = filterKeyword.indexOf('#')
        const showAnchor = anchorIndex !== -1 && tab.state.wikilink.offset >= anchorIndex
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
            showAnchor: true
          })
        } else {
          console.log(
            'items',
            state.nodes.filter((n) => {
              return n.fullPath.toLowerCase().includes(filterKeyword)
            })
          )

          setState({
            filterNodes: state.nodes.filter((n) => {
              return n.fullPath.toLowerCase().includes(filterKeyword)
            }),
            filterAnchors: [],
            showAnchor: false
          })
        }
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
        top: tab.state.wikilink.mode === 'top' ? tab.state.wikilink.top : undefined,
        bottom: tab.state.wikilink.mode === 'bottom' ? tab.state.wikilink.top : undefined,
        width: 390
      }}
    >
      <div className={'flex-1 overflow-y-auto py-2 max-h-[200px] px-2 text-[15px] relative'}>
        <>
          {!!state.showAnchor && (
            <ScrollList
              items={state.filterAnchors}
              onClose={() => {
                tab.setState((state) => {
                  state.wikilink.open = false
                })
              }}
              onSelect={(item) => {
                insert({ anchor: item })
              }}
              onTab={(item) => {
                insert({ anchor: item, complete: true })
              }}
              renderItem={(item, i) => (
                <div
                  key={i}
                  onClick={() => insert({ anchor: item })}
                  className={`flex justify-between items-center py-0.5 rounded cursor-pointer px-2`}
                >
                  <div className={'flex-1 w-0 truncate'}>{item.title}</div>
                  <div className={'ml-1'}>{headIcon.get(item.level)}</div>
                </div>
              )}
            />
          )}
          {!state.showAnchor && (
            <ScrollList
              items={state.filterNodes}
              onSelect={(item, i) => {
                insert({
                  node: item
                })
              }}
              onClose={() => {
                tab.setState((state) => {
                  state.wikilink.open = false
                })
              }}
              onTab={(item, i) => {
                insert({
                  complete: true,
                  node: item
                })
              }}
              renderItem={(item, i) => (
                <div
                  key={i}
                  className={`flex justify-center py-0.5 rounded  cursor-pointer px-2 flex-col leading-4`}
                >
                  <div
                    className={
                      'text-gray-600 dark:text-white/90 flex items-start leading-5 text-sm'
                    }
                  >
                    <div className={'h-5 flex items-center'}>
                      <FileText size={14} className={'dark:stroke-white/70 stroke-gray-500'} />
                    </div>
                    <span className={'ml-1 flex-1 max-w-full break-all w-0 text-sm'}>
                      {item.name}
                    </span>
                  </div>
                  {!!item.folder.length && (
                    <div
                      className={
                        'text-gray-500 dark:text-white/70 pl-[20px] break-all text-xs w-full truncate'
                      }
                    >
                      {item.folder.join('/')}
                    </div>
                  )}
                </div>
              )}
            />
          )}
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
