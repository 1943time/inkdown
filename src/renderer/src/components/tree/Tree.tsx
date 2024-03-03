import {observer} from 'mobx-react-lite'
import {action} from 'mobx'
import {Icon} from '@iconify/react'
import {Popover, Skeleton} from 'antd'
import React, {useCallback} from 'react'
import {useLocalState} from '../../hooks/useLocalState'
import {db, ISpace} from '../../store/db'
import {treeStore} from '../../store/tree'
import {SpaceItem} from '../space/SpaceItem'
import Folder from '../../icons/Folder'
import {FullSearch} from '../FullSearch'
import {TreeRender} from './TreeRender'
import {openContextMenu} from './openContextMenu'

const tabIndex = new Map([
  ['folder', 1],
  ['search', 2]
])

export const Tree = observer(() => {
  const [state, setState] = useLocalState({
    openMenu: false,
    spaces: [] as ISpace[]
  })

  const getSpace = useCallback(() => {
    db.space.toArray().then(res => {
      setState({spaces: res})
    })
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
              <div className={'w-80 pb-2 pt-2'}>
                {/*<div className={'flex justify-between items-center text-xs h-8 dark:text-gray-500'}>*/}
                {/*  <span className={'pl-3'}>1943dejavu@gmail.com</span>*/}
                {/*  <div className={'rounded duration-200 hover:bg-gray-200/10 p-1 cursor-pointer mr-2'}>*/}
                {/*    <Icon icon={'ic:outline-account-circle'} className={'text-base'} />*/}
                {/*  </div>*/}
                {/*</div>*/}
                {state.spaces.map(s =>
                  <SpaceItem
                    key={s.cid} item={s}
                    onClick={() => {
                      if (treeStore.root?.cid !== s.cid) {
                        treeStore.initial(s.cid)
                      }
                      setState({openMenu: false})
                    }}
                    onEdit={() => {
                      setState({openMenu: false})
                    }}
                  />
                )}
                <div className={'dark:bg-gray-200/10 h-[1px] my-2'}></div>
                <div className={'px-2 text-gray-400 text-sm'}>
                  <div
                    className={'px-2 py-1 dark:hover:bg-gray-200/10 duration-200 rounded cursor-pointer'}
                    onClick={() => {
                      setState({openMenu: false})
                      // openCreateSpace$.next(null)
                    }}
                  >
                    Create doc space
                  </div>
                </div>
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
        {!treeStore.root && treeStore.loading &&
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
        {!!treeStore.root &&
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
                    openContextMenu(e, treeStore.root)
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
