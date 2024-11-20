import { observer } from 'mobx-react-lite'
import { action } from 'mobx'
import { Icon } from '@iconify/react'
import { Popover, Skeleton } from 'antd'
import React, { useCallback, useEffect } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { db, ISpace } from '../../store/db'
import { SpaceItem } from '../space/SpaceItem'
import Folder from '../../icons/Folder'
import { FullSearch } from '../FullSearch'
import { TreeRender } from './TreeRender'
import { openContextMenu } from './openContextMenu'
import { editSpace$, spaceChange$ } from '../space/EditSpace'
import { TreeEmpty } from './TreeEmpty'
import { useSubject } from '../../hooks/subscribe'
import { arrayMoveImmutable } from 'array-move'
import { Subject } from 'rxjs'
import { getOffsetTop } from '@renderer/editor/utils/dom'
import { useCoreContext } from '../../store/core'

const tabIndex = new Map([
  ['folder', 1],
  ['search', 2]
])

const closeMenu$ = new Subject()
export const Tree = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    openMenu: false,
    spaces: [] as ISpace[],
    fullScreen: false,
    dragIndex: 0,
    dragStatus: null as {
      index: number
      mode: 'top' | 'bottom'
    } | null
  })

  const getSpace = useCallback(() => {
    db.space.orderBy('sort').toArray().then(res => {
      setState({spaces: res})
    })
  }, [])

  useEffect(() => {
    getSpace()
  }, [])

  useSubject(closeMenu$, () => {
    setState({openMenu: false})
  })

  useSubject(spaceChange$, getSpace)
  const move = useCallback(({oldIndex, newIndex}: {oldIndex: number, newIndex: number}) => {
    if (oldIndex !== newIndex) {
      setState({
        spaces: arrayMoveImmutable(state.spaces, oldIndex, newIndex)
      })
      state.spaces.map((s, i) => db.space.update(s.cid, {sort: i}))
    }
  }, [])

  const dragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (index === state.dragIndex) {
      setState({dragStatus: null})
      return
    }
    const co = document.querySelector('#space-container') as HTMLDivElement
    const target = co.children[index] as HTMLElement
    const top = getOffsetTop(target) - co.scrollTop
    const mode = e.clientY - top < 18 ? 'top' : 'bottom'
    if (
      (mode === 'top' && index === state.dragIndex + 1) ||
      (mode === 'bottom' && index === state.dragIndex - 1)
    ) {
      setState({ dragStatus: null })
      return
    }
    setState({
      dragStatus: {
        index,
        mode
      }
    })
  }, [])
  return (
    <div
      className={`flex-shrink-0 b1 tree-bg h-full width-duration ${
        !core.tree.blankMode ? 'pt-2' : 'pt-10'
      } border-r relative overflow-hidden duration-200`}
      style={{ width: core.tree.fold ? 0 : core.tree.width }}
    >
      {core.tree.blankMode && (
        <div className={'h-10 left-0 top-0 w-[calc(100%_-_40px)] absolute drag-nav'} />
      )}
      <div style={{ width: core.tree.width }} className={`h-full`}>
        <div className={`h-9 ${!core.tree.blankMode ? 'px-2' : 'px-3'}`}>
          <Popover
            trigger={['click']}
            placement={'bottomLeft'}
            arrow={false}
            open={state.openMenu}
            onOpenChange={(v) => {
              if (v) {
                getSpace()
              }
              setState({ openMenu: v })
            }}
            overlayInnerStyle={{ padding: 0 }}
            content={
              <div
                className={'w-72 py-1'}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => {
                  setState({
                    dragStatus: null
                  })
                }}
              >
                <div
                  className={
                    'flex justify-between items-center text-sm h-7 dark:text-gray-400 text-gray-500'
                  }
                >
                  <span className={'pl-3 text-xs'}>Select Workspace</span>
                </div>
                {!!state.spaces.length && (
                  <div className={'overflow-y-auto max-h-[400px] relative'} id={'space-container'}>
                    {state.spaces.map((s, i) => (
                      <div
                        key={s.cid}
                        draggable={true}
                        className={
                          state.dragStatus?.index === i
                            ? state.dragStatus?.mode === 'top'
                              ? 'enter-space-top'
                              : 'enter-space-bottom'
                            : ''
                        }
                        onDragStart={(e) => {
                          setState({
                            dragIndex: i
                          })
                        }}
                        onDragLeave={(e) => e.stopPropagation()}
                        onDragEnd={() => {
                          if (state.dragStatus) {
                            move({
                              oldIndex: state.dragIndex,
                              newIndex:
                                state.dragStatus.mode === 'top'
                                  ? state.dragStatus.index
                                  : state.dragStatus.index + 1
                            })
                          }
                          setState({
                            dragIndex: 0,
                            dragStatus: null
                          })
                        }}
                        onDragOver={(e) => dragOver(e, i)}
                      >
                        <SpaceItem
                          item={s}
                          onClick={() => {
                            if (core.tree.root?.cid !== s.cid) {
                              core.tree.initial(s.cid)
                            }
                            closeMenu$.next(null)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {!state.spaces.length && (
                  <div className={'text-center py-2 text-[13px] dark:text-gray-400 text-gray-500'}>
                    No document space has been created yet
                  </div>
                )}
                <div className={'h-[1px] my-1 bg-gray-200/70 dark:bg-gray-100/10'}></div>
                <div className={'text-sm px-1'}>
                  {!!core.tree.root && (
                    <div
                      onClick={() => {
                        editSpace$.next(core.tree.root!.cid)
                        setState({ openMenu: false })
                      }}
                      className={
                        'flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded'
                      }
                    >
                      <Icon icon={'mdi-light:settings'} />
                      <span className={'text-xs ml-2'}>Workspace Settings</span>
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setState({ openMenu: false })
                      editSpace$.next(null)
                    }}
                    className={
                      'flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded'
                    }
                  >
                    <Icon icon={'mingcute:add-line'} />
                    <span className={'text-xs ml-2'}>Create Workspace</span>
                  </div>
                </div>
              </div>
            }
          >
            {!!core.tree.root && (
              <div
                className={
                  'pl-2 pr-4 h-full relative flex items-center text-sm duration-200 rounded-lg dark:hover:bg-gray-200/5 hover:bg-gray-200/60 cursor-pointer'
                }
              >
                <div
                  className={`text-white flex-shrink-0 w-6 h-6 rounded space-${
                    core.tree.root.background || 'sky'
                  } flex items-center justify-center  font-medium`}
                >
                  {core.tree.root.name.slice(0, 1).toUpperCase()}
                </div>
                <div className={'ml-2 max-w-full truncate'}>{core.tree.root.name}</div>
                <div className={'absolute right-1 top-1/2 -translate-y-1/2'}>
                  <Icon
                    icon={'ic:round-unfold-more'}
                    className={'text-lg ml-1 flex-shrink-0 dark:text-white/60 text-black/60'}
                  />
                </div>
              </div>
            )}
            {!core.tree.root && (
              <div
                className={
                  'px-2 h-full relative flex items-center text-sm duration-200 rounded-lg dark:hover:bg-gray-200/5 hover:bg-gray-200/60 cursor-pointer'
                }
              >
                <div
                  className={`dark:text-white text-gray-700 flex-shrink-0 w-6 h-6 rounded bg-gray-300  dark:bg-gray-200/20 flex items-center justify-center  font-medium`}
                >
                  <Icon icon={'ph:calendar-blank'} />
                </div>
                <div className={'ml-2 max-w-full truncate text-sm'}>Select Workspace</div>
                <div className={'absolute right-1 top-1/2 -translate-y-1/2'}>
                  <Icon
                    icon={'ic:round-unfold-more'}
                    className={'text-lg ml-1 flex-shrink-0 dark:text-white/60 text-black/60'}
                  />
                </div>
              </div>
            )}
          </Popover>
        </div>
        {core.tree.loading && (
          <div className={'p-4 w-full'}>
            <Skeleton
              active={true}
              paragraph={{
                rows: 5,
                width: ['100%', '80%', '100%', '80%']
              }}
            />
          </div>
        )}
        {!core.tree.loading && !core.tree.root && <TreeEmpty spaces={state.spaces} />}
        {!!core.tree.root && !core.tree.loading && (
          <>
            <div className={'h-[calc(100vh_-_76px)] flex flex-col'}>
              <div className={'h-7 mb-3 mt-3 px-3 flex-shrink-0'}>
                <div
                  className={
                    'flex dark:bg-white/5 bg-black/5 h-full rounded relative overflow-hidden px-1'
                  }
                >
                  <div
                    className={'tree-tab'}
                    onClick={action(() => (core.tree.treeTab = 'folder'))}
                  >
                    <Folder className={'text-[17px]'} />
                  </div>
                  <div
                    className={'tree-tab'}
                    onClick={action(() => (core.tree.treeTab = 'search'))}
                  >
                    <Icon icon={'tdesign:search'} className={'text-[17px]'} />
                  </div>
                  <div
                    className={
                      'absolute w-[calc(50%_-_4px)] h-[22px] top-[3px] left-1 dark:bg-black/30 bg-white/90 rounded duration-150 dark:shadow-gray-200/10 shadow-sm shadow-gray-300'
                    }
                    style={{
                      transform: `translateX(${(tabIndex.get(core.tree.treeTab)! - 1) * 100 + '%'})`
                    }}
                  />
                </div>
              </div>
              <div
                className={`flex-1 overflow-y-auto pb-20`}
                id={'tree-content'}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={action((e) => {
                  core.tree.dragStatus = null
                })}
                onDrop={(e) => core.tree.moveDragFiles(e)}
                onContextMenu={(e) => {
                  if (core.tree.treeTab === 'folder') {
                    openContextMenu(e, core.tree.root!)
                  }
                }}
              >
                <div
                  className={`${core.tree.treeTab === 'folder' ? '' : 'hidden'}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <div>
                    <TreeRender />
                  </div>
                </div>
                <div className={`${core.tree.treeTab === 'search' ? '' : 'hidden'}`}>
                  <FullSearch />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
})
