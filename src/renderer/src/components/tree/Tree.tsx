import {observer} from 'mobx-react-lite'
import {action, runInAction} from 'mobx'
import {Icon} from '@iconify/react'
import {Popover, Skeleton} from 'antd'
import React, {useCallback, useEffect} from 'react'
import {useLocalState} from '../../hooks/useLocalState'
import {db, ISpace} from '../../store/db'
import {treeStore} from '../../store/tree'
import {SpaceItem} from '../space/SpaceItem'
import Folder from '../../icons/Folder'
import {FullSearch} from '../FullSearch'
import {TreeRender} from './TreeRender'
import {openContextMenu} from './openContextMenu'
import {editSpace$, spaceChange$} from '../space/EditSpace'
import {TreeEmpty} from './TreeEmpty'
import {useSubject} from '../../hooks/subscribe'
import {SortableContainer, SortableElement} from 'react-sortable-hoc'
import {arrayMoveImmutable} from 'array-move'
import {Subject} from 'rxjs'

const tabIndex = new Map([
  ['folder', 1],
  ['search', 2]
])
const closeMenu$ = new Subject()

const SortSpaceItem = SortableElement<{s: ISpace, dragging: boolean}>(({s, dragging}) => {
  return (
    <SpaceItem
      key={s.cid} item={s}
      dragging={dragging}
      onClick={() => {
        if (treeStore.root?.cid !== s.cid) {
          treeStore.initial(s.cid)
        }
        closeMenu$.next(null)
      }}
      onEdit={() => {
        closeMenu$.next(null)
      }}
    />
  )
})
const SortSpaceContainer = SortableContainer<{items: ISpace[], dragging: boolean}>((props: {items: ISpace[], dragging: boolean}) => {
  return (
    <div className={'overflow-y-auto max-h-[400px]'}>
      {props.items.map((item, index) => <SortSpaceItem s={item} index={index} key={item.cid} dragging={props.dragging}/>)}
    </div>
  )
})
export const Tree = observer(() => {
  const [state, setState] = useLocalState({
    openMenu: false,
    spaces: [] as ISpace[],
    dragging: false
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
    setTimeout(() => {
      setState({dragging: false})
    }, 200)
  }, [])
  return (
    <div
      className={'flex-shrink-0 b1 tree-bg h-full width-duration border-r pt-[40px] overflow-hidden duration-200'}
      style={{width: treeStore.fold ? 0 : treeStore.width}}
    >
      <div
        style={{width: treeStore.width}}
        className={`h-full`}
      >
        <div className={'h-9 px-4'}>
          <Popover
            trigger={['click']}
            placement={'bottomLeft'}
            arrow={false}
            open={state.openMenu}
            onOpenChange={v => {
              if (v) {
                getSpace()
              }
              setState({openMenu: v})
            }}
            overlayInnerStyle={{padding: 0}}
            content={(
              <div className={'w-80 pt-1 pb-2'}>
                <div className={'flex justify-between items-center text-sm h-7 dark:text-gray-400 text-gray-500'}>
                  <span className={'pl-3'}>Space</span>
                  <div
                    className={'rounded duration-200 hover:bg-gray-200/10 p-1 cursor-pointer mr-2'}
                    onClick={() => {
                      setState({openMenu: false})
                      editSpace$.next(null)
                    }}
                  >
                    <Icon icon={'mingcute:add-line'} className={'text-base'}/>
                  </div>
                </div>
                {!!state.spaces.length &&
                  <SortSpaceContainer
                    items={state.spaces}
                    pressDelay={100}
                    helperClass={'z-[1500] duration-0 dark:bg-gray-200/10 text-sm dark:text-gray-400 text-gray-500'}
                    dragging={state.dragging}
                    onSortStart={() => setState({dragging: true})}
                    onSortEnd={move}
                  />
                }
                {!state.spaces.length &&
                  <div className={'text-center py-2 text-[13px] dark:text-gray-400 text-gray-500'}>
                    No document space has been created yet
                  </div>
                }
              </div>
            )}
          >
            {!!treeStore.root &&
              <div
                className={'px-2 h-full flex items-center text-sm duration-200 rounded dark:hover:bg-gray-200/5 hover:bg-gray-200/60 cursor-pointer'}
              >
                <div
                  className={`text-white flex-shrink-0 w-6 h-6 rounded bg-indigo-400 dark:bg-indigo-500 flex items-center justify-center  font-medium`}>
                  {treeStore.root.name.slice(0, 1).toUpperCase()}
                </div>
                <div className={'ml-2 max-w-full truncate'}>{treeStore.root.name}</div>
                <div>
                  <Icon icon={'ic:round-unfold-more'} className={'text-base ml-1 flex-shrink-0 text-gray-500'}/>
                </div>
              </div>
            }
            {!treeStore.root &&
              <div
                className={'px-2 h-full flex items-center text-sm duration-200 rounded dark:hover:bg-gray-200/5 hover:bg-gray-200/60 cursor-pointer'}
              >
                <div
                  className={`dark:text-white text-gray-700 flex-shrink-0 w-6 h-6 rounded bg-gray-300  dark:bg-gray-200/20 flex items-center justify-center  font-medium`}>
                  <Icon icon={'ph:calendar-blank'}/>
                </div>
                <div className={'ml-2 max-w-full truncate'}>Select doc space</div>
                <div>
                  <Icon icon={'ic:round-unfold-more'} className={'text-base ml-1 flex-shrink-0 text-gray-500'}/>
                </div>
              </div>
            }
          </Popover>
        </div>
        {treeStore.loading &&
          <div
            className={'p-4 w-full'}
          >
            <Skeleton
              active={true}
              paragraph={{
                rows: 5,
                width: [
                  '100%',
                  '80%',
                  '100%',
                  '80%'
                ]
              }}
            />
          </div>
        }
        {!treeStore.loading && !treeStore.root &&
          <TreeEmpty spaces={state.spaces}/>
        }
        {!!treeStore.root && !treeStore.loading &&
          <>
            <div className={'h-[calc(100vh_-_76px)] flex flex-col'}>
              <div className={'h-7 mb-3 mt-3 px-4 flex-shrink-0'}>
                <div className={'flex dark:bg-white/5 bg-black/5 h-full rounded relative overflow-hidden px-1'}>
                  <div
                    className={'tree-tab'}
                    onClick={action(() => treeStore.treeTab = 'folder')}
                  >
                    <Folder className={'text-[17px]'}/>
                  </div>
                  <div
                    className={'tree-tab'}
                    onClick={action(() => treeStore.treeTab = 'search')}
                  >
                    <Icon icon={'tdesign:search'} className={'text-[17px]'}/>
                  </div>
                  <div
                    className={'absolute w-[calc(50%_-_4px)] h-[22px] top-[3px] left-1 dark:bg-black/30 bg-white/90 rounded duration-150 dark:shadow-gray-200/10 shadow-sm shadow-gray-300'}
                    style={{transform: `translateX(${(tabIndex.get(treeStore.treeTab)! - 1) * 100 + '%'})`}}
                  />
                </div>
              </div>
              <div
                className={`flex-1 overflow-y-auto pb-20`}
                id={'tree-content'}
                onDragOver={e => e.preventDefault()}
                onDragLeave={action(e => {
                  treeStore.dragStatus = null
                })}
                onContextMenu={e => {
                  if (treeStore.treeTab === 'folder') {
                    openContextMenu(e, treeStore.root!)
                  }
                }}
              >
                <div
                  className={`${treeStore.treeTab === 'folder' ? '' : 'hidden'}`}
                  onContextMenu={e => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <div>
                    <TreeRender/>
                  </div>
                </div>
                <div
                  className={`${treeStore.treeTab === 'search' ? '' : 'hidden'}`}>
                  <FullSearch/>
                </div>
              </div>
            </div>
          </>
        }
      </div>
    </div>
  )
})
