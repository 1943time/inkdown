import { observer } from 'mobx-react-lite'
import { MoreOutlined } from '@ant-design/icons'
import { Fragment, useRef } from 'react'
import { action, runInAction } from 'mobx'
import INote from '../../icons/INote.tsx'
import ArrowRight from '../../icons/ArrowRight.tsx'
import { IFileItem } from '../../types'
import IPlus from '../../icons/Iplus.tsx'
import { useCoreContext } from '../../utils/env.ts'
import { TreeStore } from '../../store/tree.ts'
import { IFolder } from '../../icons/IFolder.tsx'
export const getClass = (tree: TreeStore, c: IFileItem) => {
  if (tree.selectItem === c) return 'dark:bg-blue-500/20 bg-blue-500/20'
  if (tree.openedNote === c) return 'dark:bg-gray-200/10 bg-gray-200'
  if (tree.ctxNode === c) return `dark:bg-gray-400/5 bg-gray-400/10`
  return 'dark:hover:bg-gray-400/10 hover:bg-gray-400/10'
}

export const TreeRender = observer(() => {
  const core = useCoreContext()
  return (
    <>
      <div
        onContextMenu={(e) => e.stopPropagation()}
        className={`py-1 flex justify-between items-center pl-5 pr-[14px] dark:text-gray-400 text-gray-500`}
      >
        <span className={'font-semibold text-[13px] flex items-center'}>
          <span>Folders</span>
        </span>
        <div
          className={`duration-100 p-1 rounded dark:hover:text-gray-300 hover:text-gray-600 cursor-pointer ${
            core.tree.ctxNode?.root
              ? 'dark:bg-gray-300/10 bg-gray-200/70'
              : 'dark:hover:bg-gray-300/10 hover:bg-gray-200/70'
          }`}
          onClick={(e) => {
            core.menu.openContextMenu(e, core.tree.root!)
          }}
        >
          <IPlus className={'text-base'} />
        </div>
      </div>
      <div className={'px-3'} onContextMenu={(e) => e.stopPropagation()}>
        {!!core.tree.root && <RenderItem items={core.tree.root.children || []} level={0} />}
        {!core.tree.root && core.tree.initialized && (
          <div className={'mt-20  text-sm'}>
            <div className={'text-gray-400 text-center'}>No space document yet</div>
            <div
              className={'mt-2 flex justify-center items-center link cursor-pointer'}
              onClick={() => {
                core.menu.createDoc({ parent: core.tree.root })
              }}
            >
              <INote />
              <span className={'ml-1'}>New doc</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
})

const checkChildren = (node: IFileItem, targetNode: IFileItem) => {
  while (targetNode) {
    if (targetNode.parent.root) {
      return true
    }
    if (targetNode.parent.cid === node.cid) {
      return false
    }
    targetNode = targetNode.parent
  }
  return true
}
const Item = observer(({ item, level }: { item: IFileItem; level: number }) => {
  const core = useCoreContext()
  const el = useRef<HTMLDivElement>(null)
  return (
    <Fragment>
      <div
        ref={el}
        data-fid={item.cid}
        className={'py-[1px]'}
        onDragLeave={(e) => e.stopPropagation()}
        onDragOver={action((e) => {
          e.stopPropagation()
          e.preventDefault()
          const scrollTop = document.querySelector('#tree-container')?.scrollTop || 0
          const offsetY = e.clientY - (el.current?.offsetTop || 0) + scrollTop
          let mode: 'top' | 'bottom' | 'enter' = 'top'

          if (item.folder) {
            mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
          } else {
            mode = offsetY < 24 ? 'top' : 'bottom'
          }
          if (mode === 'enter' && !item.folder && core.tree.dragStatus) {
            core.tree.dragStatus = null
            return
          }
          const dragNode = core.tree.dragNode
          if (dragNode && !checkChildren(dragNode, item)) {
            core.tree.dragStatus = null
            return
          }
          if (core.tree.dragStatus?.dropNode !== item || core.tree.dragStatus.mode !== mode) {
            core.tree.dragStatus = {
              dropNode: item,
              mode
            }
          }
        })}
      >
        <div
          style={{
            paddingLeft: level * 15
          }}
          className={`rounded group relative ${getClass(core.tree, item)}`}
        >
          <div
            className={`${core.tree.openedNote === item ? 'dark:text-zinc-100 text-zinc-900' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
           text-sm cursor-default select-none h-7 pr-2 group`}
            style={{ paddingLeft: item.folder ? 2 : 17 }}
            onDragEnd={() => {
              core.tree.moveNode()
              el.current!.style.opacity = ''
            }}
            draggable={'true'}
            onDragStart={action((e) => {
              core.tree.dragNode = item
              el.current!.style.opacity = '0.5'
              if (item === core.tree.openedNote && core.tree.currentTab.store.docChanged) {
                core.tree.currentTab.store.saveDoc$.next(null)
              }
            })}
            onContextMenu={(e) => {
              e.preventDefault()
              core.menu.openContextMenu(e, item)
            }}
            onClick={action((e) => {
              e.stopPropagation()
              runInAction(() => {
                core.tree.selectItem = item
              })
              if (!item.folder) {
                if (e.metaKey || e.ctrlKey) {
                  core.tree.appendTab(item)
                } else {
                  core.tree.openNote(item)
                }
              } else {
                item.expand = !item.expand
              }
            })}
          >
            <div
              className={`
            ${item.folder && core.tree.dragNode !== item && core.tree.dragStatus?.dropNode === item && core.tree.dragStatus.mode === 'enter' ? 'dark:border-white/30 border-black/30' : 'border-transparent'}
            flex items-center h-full rounded pr-2 border
            `}
            >
              {item.folder && (
                <div className={'w-4 h-full flex items-center justify-center'}>
                  <ArrowRight
                    className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${item.folder && item.expand ? 'rotate-90' : ''}`}
                  />
                </div>
              )}
              <div
                className={`flex items-center flex-1 h-full relative max-w-full ${core.tree.openedNote === item ? 'dark:text-white text-black' : ''}`}
                data-entity={'true'}
              >
                <div className={`relative flex-shrink-0 ${core.service.isPublished(item) ? 'text-sky-500' : ''}`}>
                  {!!item.folder && <IFolder className={'flex-shrink-0'} />}
                  {!item.folder && <INote className={'flex-shrink-0'} />}
                </div>
                <div className={'truncate max-w-full ml-1'}>{item.name || 'Untitled'}</div>
                {core.tree.dragStatus?.dropNode === item &&
                  core.tree.dragNode !== item &&
                  core.tree.dragStatus.mode !== 'enter' && (
                    <div
                      className={`w-full h-0.5 rounded dark:bg-white/30 bg-black/30 absolute right-0 ${core.tree.dragStatus.mode === 'top' ? 'top-0' : 'bottom-0'}`}
                    />
                  )}
              </div>
            </div>
          </div>
          {core.tree.dragNode !== item && (
            <div
              onClick={(e) => {
                core.menu.openContextMenu(e, item)
              }}
              className={`h-6 rounded top-1/2 -mt-3 ${core.tree.ctxNode === item ? 'flex dark:bg-gray-200/20 bg-gray-400/30' : 'hidden group-hover:flex dark:hover:bg-gray-200/20 hover:bg-gray-400/30'}
            absolute right-1 w-[14px] justify-center items-center dark:text-gray-200 text-lg`}
            >
              <MoreOutlined />
            </div>
          )}
        </div>
      </div>
      {item.folder && !!item.children?.length && !!item.expand && (
        <RenderItem items={item.children} level={level + 1} />
      )}
    </Fragment>
  )
})

const RenderItem = observer(({ items, level }: { items: IFileItem[]; level: number }) => {
  return (
    <>
      {items.map((c) => (
        <Item key={c.cid} item={c} level={level} />
      ))}
    </>
  )
})
