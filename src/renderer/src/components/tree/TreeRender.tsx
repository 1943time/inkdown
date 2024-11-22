import { observer } from 'mobx-react-lite'
import { MoreOutlined } from '@ant-design/icons'
import { Fragment, useRef } from 'react'
import { action } from 'mobx'
import INote from '../../icons/INote'
import ArrowRight from '../../icons/ArrowRight'
import IFolder from '../../icons/IFolder'
import { IFileItem } from '../../types/index'
import { Icon } from '@iconify/react'
import Iplus from '../../icons/Iplus'
import { Core, useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'

const checkChildren = (node: IFileItem, targetNode?: IFileItem) => {
  while(targetNode) {
    if (targetNode.parent?.root) {
      return true
    }
    if (targetNode.parent?.cid === node.cid) {
      return false
    }
    targetNode = targetNode.parent
  }
  return true
}
const getClass = (c: IFileItem, core: Core) => {
  if (core.tree.selectItem === c) return 'dark:bg-blue-500/20 bg-blue-500/20'
  if (core.tree.openedNote === c) return 'dark:bg-white/10 bg-gray-700/10'
  if (core.tree.ctxNode === c) return `dark:bg-gray-400/5 bg-gray-400/10`
  return 'dark:hover:bg-gray-400/10 hover:bg-gray-400/15'
}

export const TreeRender = observer(() => {
  const core = useCoreContext()
  const {t} = useTranslation()
  return (
    <>
      <div
        className={`mb-1 py-1 flex justify-between items-center pl-5 pr-4 dark:text-gray-400 text-gray-500`}
      >
        <span className={'font-semibold text-sm flex items-center'}>
          <span>Folders</span>
        </span>
        <div
          className={`duration-100 w-[22px] h-[22px] flex items-center text-base justify-center cursor-pointer rounded ${
            core.tree.ctxNode?.root
              ? 'dark:bg-gray-300/10 bg-gray-200/70'
              : 'dark:hover:bg-gray-300/10 hover:bg-gray-200/70'
          } `}
          onClick={(e) => {
            core.menu.openTreeMenu(e, core.tree.root!)
          }}
        >
          <Iplus />
        </div>
      </div>
      <div className={'px-3'} onContextMenu={(e) => e.stopPropagation()}>
        {!!core.tree.root && <RenderItem items={core.tree.root.children || []} level={0} />}
        {!core.tree.root && (
          <div className={'mt-20'}>
            <div className={'text-gray-400 text-center text-sm'}>No space document yet</div>
          </div>
        )}
        {core.tree.root && !core.tree.root.children?.length && (
          <div className={'text-gray-400 text-center text-sm mt-20'}>
            {t('noCreateDoc')}
          </div>
        )}
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
  const core = useCoreContext()
  const el = useRef<HTMLDivElement>(null)
  return (
    <Fragment>
      <div
        ref={el}
        data-fid={item.cid}
        className={'py-[1px]'}
        onDragLeave={(e) => e.stopPropagation()}
        onDrop={(e) => {
          if (item.folder) {
            e.stopPropagation()
            core.tree.moveDragFiles(e, item)
          }
        }}
        onDragOver={action((e) => {
          if (!core.tree.dragNode) return
          e.stopPropagation()
          e.preventDefault()
          const scrollTop = document.querySelector('#tree-content')?.scrollTop || 0
          const offsetY = e.clientY - (el.current?.offsetTop || 0) + scrollTop
          const mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
          if (!checkChildren(core.tree.dragNode, item)) {
            core.tree.dragStatus = null
            return
          }
          if (mode === 'enter' && !item.folder && core.tree.dragStatus) {
            core.tree.dragStatus = null
          } else {
            const mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
            if (core.tree.dragStatus?.dropNode !== item || core.tree.dragStatus.mode !== mode) {
              core.tree.dragStatus = {
                dropNode: item,
                mode
              }
            }
          }
        })}
      >
        <div
          style={{
            paddingLeft: level * 15
          }}
          className={`rounded group relative ${getClass(item, core)}`}
        >
          <div
            className={`${
              core.tree.openedNote === item
                ? 'dark:text-zinc-100 text-zinc-900'
                : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'
            }
           text-sm cursor-default select-none h-7 pr-2 group`}
            style={{ paddingLeft: item.folder ? 6 : 21 }}
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
              core.menu.openTreeMenu(e, item)
            }}
            onClick={action((e) => {
              e.stopPropagation()
              core.tree.selectItem = item
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
            ${
              item.folder &&
              core.tree.dragNode !== item &&
              core.tree.dragStatus?.dropNode === item &&
              core.tree.dragStatus.mode === 'enter'
                ? 'dark:border-white/30 border-black/30'
                : 'border-transparent'
            }
            flex items-center h-full rounded pr-2 border
            `}
            >
              {item.folder && (
                <div className={'w-4 h-full flex items-center justify-center'}>
                  <ArrowRight
                    className={`w-[11px] h-[11px] dark:text-gray-500 text-gray-400 duration-200 ${
                      item.folder && item.expand ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              )}
              <div
                className={`flex items-center flex-1 h-full relative max-w-full ${
                  core.tree.openedNote === item ? 'text-black dark:text-white' : ''
                }`}
                data-entity={'true'}
              >
                {!!item.folder && <IFolder className={'flex-shrink-0'} />}
                {item.ext === 'md' && <INote className={'flex-shrink-0'} />}
                {!item.folder && item.ext !== 'md' && (
                  <Icon icon={'uil:file'} className={'text-base flex-shrink-0'} />
                )}
                <div className={'truncate max-w-full ml-1'}>{item.filename || 'Untitled'}</div>
                {!item.folder && item.ext !== 'md' && (
                  <sup className={'ml-1 text-blue-600 mr-1'}>{item.ext}</sup>
                )}
                {core.tree.dragStatus?.dropNode === item &&
                  core.tree.dragNode !== item &&
                  core.tree.dragStatus.mode !== 'enter' && (
                    <div
                      className={`w-full h-0.5 rounded dark:bg-white/30 bg-black/30 absolute right-0 ${
                        core.tree.dragStatus.mode === 'top' ? 'top-0' : 'bottom-0'
                      }`}
                    />
                  )}
              </div>
            </div>
          </div>
          {core.tree.dragNode !== item && (
            <div
              onClick={(e) => {
                core.menu.openTreeMenu(e, item)
              }}
              className={`dark:hover:bg-gray-200/20 hover:bg-gray-400/30 h-6 rounded top-1/2 -mt-3 ${
                core.tree.ctxNode === item
                  ? 'flex bg-gray-400/30 dark:bg-gray-200/20'
                  : 'hidden group-hover:flex'
              }
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

const RenderItem = observer(({items, level}: { items: IFileItem[], level: number }) => {
  const core = useCoreContext()
  return (
    <>
      {items.filter(c => core.config.config.showHiddenFiles || !c.hidden || c.filename === (core.tree.root?.imageFolder || '.images')).map(c =>
        <Item
          key={c.cid}
          item={c}
          level={level}
        />
      )}
    </>
  )
})
