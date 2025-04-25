import { useObserveKey } from '@/hooks/common'
import { useLocalState } from '@/hooks/useLocalState'
import { useTab } from '@/store/note/TabCtx'
import { getDomRect } from '@/utils/dom'
import { ArrowDownUp, CircleX, FileText, X } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef } from 'react'
import { IDoc } from 'types/model'

export const ChooseLink = observer(() => {
  const tab = useTab()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    Nodes: [] as string[],
    filterNodes: [] as string[],
    showAnchor: false,
    index: 0,
    anchors: [] as { title: string; level: number }[],
    filterAnchors: [] as { title: string; level: number }[]
  })
  // useEffect(() => {
  //   if (tab.state.openChooseLink) {
  //     const rect = getDomRect()
  //     console.log('rect', rect)

  //     const docs = Object.values(tab.store.note.state.nodes)
  //       .filter((item) => !item.folder)
  //       .map((item) => tab.store.note.getDocPath(item).join('/'))
  //     setState({
  //       filterNodes: docs,
  //       anchors: []
  //     })
  //   }
  // }, [tab.state.openChooseLink])
  // useObserveKey(tab.state, 'wikiLinkKeyword', (value) => {})
  if (!tab.state.wikilink.open) return null
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={'absolute z-30 w-[370px] ctx-panel pt-3 flex flex-col'}
      style={{
        left: tab.state.wikilink.left,
        top: tab.state.wikilink.top,
        width: 390,
        height: 200
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
                onClick={(e) => {
                  // close({
                  //   docId: a.item.cid === core.tree.openedNote?.cid ? undefined : a.item.cid,
                  //   hash: a.value
                  // })
                }}
                className={`flex justify-center py-0.5 rounded ${
                  state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                } cursor-pointer px-2 flex-col`}
              >
                <div className={'text-gray-600 dark:text-gray-300 flex items-start leading-6'}>
                  <div className={'h-6 flex items-center'}>
                    <FileText />
                  </div>
                  <span className={'ml-1 flex-1 max-w-full break-all text-sm'}>
                    {/* {a.item.cid === store.openCid ? '' : a.item.name}#{a.value} */}
                  </span>
                </div>
                {/* {!!a.item.parent && !a.item.parent.root && (
                      <div
                        className={
                          'text-gray-500 dark:text-gray-400 text-sm pl-[18px] break-all text-[13px]'
                        }
                      >
                        {a.item.path?.split('/').slice(0, -1).join('/')}
                      </div>
                    )} */}
              </div>
            ))}
          {!state.showAnchor &&
            state.filterNodes.map((f, i) => {
              return (
                <div
                  key={f}
                  onMouseEnter={(e) => {
                    setState({ index: i })
                  }}
                  onClick={(e) => {}}
                  className={`flex justify-center py-0.5 rounded ${
                    state.index === i ? 'bg-gray-200/70 dark:bg-gray-100/10' : ''
                  } cursor-pointer px-2 flex-col`}
                >
                  <div
                    className={
                      'text-gray-600 dark:text-white/90 flex items-start leading-6 text-sm'
                    }
                  >
                    <div className={'h-6 flex items-center'}>
                      <FileText />
                    </div>
                    <span className={'ml-1 flex-1 max-w-full break-all'}>{f}</span>
                  </div>
                  {/* {!!f.parent && !f.parent.root && (
                        <div
                          className={
                            'text-gray-500 dark:text-white/70 pl-[18px] break-all text-[13px]'
                          }
                        >
                          {getNodePath(f).slice(0, -1).join('/')}
                        </div>
                      )} */}
                </div>
              )
            })}
          {/* {((!!state.anchors.length && !state.filterAnchors.length) ||
                (!!state().docs.length && !state().filterDocs.length) || (!state().anchors.length && !state().docs.length)) && (
                <div className={'py-4 text-center text-gray-400 text-sm'}>
                  {core.config.zh ? '没有相关文档' : 'No related documents'}
                </div>
              )} */}
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
