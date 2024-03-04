import {observer} from 'mobx-react-lite'
import {MoreOutlined, PlusCircleOutlined} from '@ant-design/icons'
import React, {Fragment, useRef} from 'react'
import {action} from 'mobx'
import INote from '../../icons/INote'
import ArrowRight from '../../icons/ArrowRight'
import IFolder from '../../icons/IFolder'
import {treeStore} from '../../store/tree'
import {IFileItem} from '../../index'
import {openContextMenu} from './openContextMenu'
import {Icon} from '@iconify/react'
import {configStore} from '../../store/config'

const getClass = (c: IFileItem) => {
  if (treeStore.selectItem === c) return 'dark:bg-indigo-500/15 bg-indigo-500/15'
  if (treeStore.openedNote === c) return 'dark:bg-gray-300/10 bg-gray-500/10'
  if (treeStore.ctxNode === c) return `dark:bg-gray-400/5 bg-gray-400/10`
  return 'dark:hover:bg-gray-400/10 hover:bg-gray-400/10'
}

export const TreeRender = observer(() => {
  return (
    <>
      <div
        className={`mb-1 py-1 flex justify-between items-center px-5 dark:text-gray-400 text-gray-500`}
      >
        <span className={'font-medium text-[15px] flex items-center'}>
          <span>
            Folders
          </span>
        </span>
        <div
          className={'duration-200 dark:hover:text-gray-300 hover:text-gray-600 cursor-pointer'}
          onClick={e =>{
            openContextMenu(e, treeStore.root!)
          }}
        >
          <PlusCircleOutlined/>
        </div>
      </div>
      <div
        className={'px-3'}
        onContextMenu={e => e.stopPropagation()}
      >
        {!!treeStore.root &&
          <RenderItem items={treeStore.root.children || []} level={0}/>
        }
        {!treeStore.root &&
          <div className={'mt-20'}>
            <div className={'text-gray-400 text-center text-sm'}>
              No space document yet
            </div>
            <div
              className={'mt-2 flex justify-center items-center link cursor-pointer'}
              onClick={() => {
                // $tree.createNote()
              }}
            >
              <INote/>
              <span className={'ml-1'}>New doc</span>
            </div>
          </div>
        }
      </div>
    </>
  )
})

const Item = observer((
  {item, level}: {
    item: IFileItem,
    level: number
  }
) => {
  const el = useRef<HTMLDivElement>(null)
  return (
    <Fragment>
      <div
        ref={el}
        data-fid={item.cid}
        className={'py-[1px]'}
        onDragLeave={e => e.stopPropagation()}
        onDragOver={action(e => {
          e.stopPropagation()
          e.preventDefault()
          const scrollTop = document.querySelector('#tree-content')?.scrollTop || 0
          const offsetY = e.clientY - (el.current?.offsetTop || 0) + scrollTop
          const mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
          if (mode === 'enter' && !item.folder && treeStore.dragStatus) {
            treeStore.dragStatus = null
          } else {
            const mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
            if (treeStore.dragStatus?.dropNode !== item || treeStore.dragStatus.mode !== mode) {
              treeStore.dragStatus = {
                dropNode: item,
                mode
              }
            }
          }
        })}
      >
        <div
          style={{
            paddingLeft: level * 15,
          }}
          className={`rounded group relative ${getClass(item)}`}
        >
          <div
            className={`${treeStore.openedNote === item ? 'dark:text-zinc-100 text-zinc-900' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
           text-sm cursor-default select-none h-7 pr-2 group`}
            style={{paddingLeft: item.folder ? 6 : 21}}
            onDragEnd={() => {
              treeStore.moveNode()
              el.current!.style.opacity = ''
            }}
            draggable={'true'}
            onDragStart={action(e => {
              treeStore.dragNode = item
              el.current!.style.opacity = '0.5'
            })}
            onContextMenu={(e) => {
              e.preventDefault()
              openContextMenu(e, item)
            }}
            onClick={action((e) => {
              e.stopPropagation()
              treeStore.selectItem = item
              if (!item.folder) {
                if (e.metaKey || e.ctrlKey) {
                  treeStore.appendTab(item)
                } else {
                  treeStore.openNote(item)
                }
              } else {
                item.expand = !item.expand
              }
            })}
          >
            <div className={`
            ${item.folder && treeStore.dragNode !== item && treeStore.dragStatus?.dropNode === item && treeStore.dragStatus.mode === 'enter' ? 'dark:border-white/30 border-black/30' : 'border-transparent'}
            flex items-center h-full rounded pr-2 border
            `}>
              {item.folder &&
                <div className={'w-4 h-full flex items-center justify-center'}>
                  <ArrowRight
                    className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${item.folder && item.expand ? 'rotate-90' : ''}`}
                  />
                </div>
              }
              <div
                className={`flex items-center flex-1 h-full relative max-w-full ${treeStore.openedNote === item ? 'text-indigo-600 dark:text-indigo-400' : ''}`}
                data-entity={'true'}>
                {!!item.folder &&
                  <IFolder className={'flex-shrink-0'}/>
                }
                {item.ext === 'md' &&
                  <INote className={'flex-shrink-0'}/>
                }
                {!item.folder && item.ext !== 'md' &&
                  <Icon icon={'uil:file'} className={'text-base flex-shrink-0'}/>
                }
                <div className={'truncate max-w-full ml-1'}>
                  {item.filename || 'Untitled'}
                </div>
                {!item.folder && item.ext !== 'md' &&
                  <sup className={'ml-1 text-indigo-600 mr-1'}>{item.ext}</sup>
                }
                {treeStore.dragStatus?.dropNode === item && treeStore.dragNode !== item && treeStore.dragStatus.mode !== 'enter' &&
                  <div
                    className={`w-full h-0.5 rounded dark:bg-white/30 bg-black/30 absolute right-0 ${treeStore.dragStatus.mode === 'top' ? 'top-0' : 'bottom-0'}`}
                  />
                }
              </div>
            </div>
          </div>
          {treeStore.dragNode !== item &&
            <div
              onClick={e => {
                openContextMenu(e, item)
              }}
              className={`dark:hover:bg-gray-200/20 hover:bg-gray-400/30 h-6 rounded top-1/2 -mt-3 ${treeStore.ctxNode === item ? 'flex' : 'hidden group-hover:flex'}
            absolute right-1 w-[14px] justify-center items-center dark:text-gray-200 text-lg`}
            >
              <MoreOutlined/>
            </div>
          }
        </div>
      </div>
      {item.folder && !!item.children?.length && !!item.expand &&
        <RenderItem items={item.children} level={level + 1}/>
      }
    </Fragment>
  )
})

const RenderItem = observer(({items, level}: { items: IFileItem[], level: number }) => {
  return (
    <>
      {items.filter(c => configStore.config.showHiddenFiles || !c.hidden || c.filename === configStore.config.imagesFolder).map(c =>
        <Item
          key={c.cid}
          item={c}
          level={level}
        />
      )}
    </>
  )
})
