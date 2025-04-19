import { observer } from 'mobx-react-lite'
import { MoreOutlined } from '@ant-design/icons'
import { Fragment, useCallback, useRef } from 'react'
import { action } from 'mobx'
import { Store, useStore } from '@/store/store'
import { IDoc } from 'types/model'
import { ChevronRight, FileText, FolderClosed, Plus } from 'lucide-react'
export const getClass = (tree: Store, c: IDoc) => {
  if (tree.note.state.selectedDoc?.id === c.id) return 'dark:bg-blue-500/20 bg-blue-500/20'
  if (tree.note.state.opendDoc?.id === c.id) return 'dark:bg-gray-200/10 bg-gray-200'
  if (tree.note.state.ctxNode?.id === c.id) return `dark:bg-gray-400/5 bg-gray-400/10`
  return 'dark:hover:bg-gray-400/10 hover:bg-gray-400/10'
}

export const TreeRender = observer(() => {
  const store = useStore()
  return (
    <>
      <div
        onContextMenu={(e) => e.stopPropagation()}
        className={`py-1 flex justify-between items-center pl-4 pr-2.5 dark:text-gray-400 text-gray-500`}
      >
        <span className={'font-semibold text-[13px] flex items-center'}>
          <span>Folders</span>
        </span>
        <div
          className={`duration-100 p-0.5 rounded dark:hover:text-gray-300 hover:text-gray-600 cursor-pointer ${
            store.note.state.ctxNode?.id === 'root'
              ? 'dark:bg-gray-300/10 bg-gray-200/70'
              : 'dark:hover:bg-gray-300/10 hover:bg-gray-200/70'
          }`}
          onClick={(e) => {
            store.menu.openContextMenu(e, store.note.state.root)
          }}
        >
          <Plus size={20} />
        </div>
      </div>
      <div onContextMenu={(e) => e.stopPropagation()} className={'px-2'} id={'tree-content'}>
        <RenderItem items={store.note.state.root.children || []} level={0} />
        {!store.note.state.root.children?.length && (
          <div className={'mt-10  text-sm'}>
            <div className={'text-gray-400 text-center'}>No space document yet</div>
            <div
              className={
                'mt-2 flex justify-center items-center link cursor-pointer hover:text-white text-gray-400 duration-200'
              }
              onClick={() => {
                store.menu.createDoc()
              }}
            >
              <FileText size={16} />
              <span className={'ml-1'}>New doc</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
})

const checkChildren = (node: IDoc, targetNode: IDoc | undefined, nodes: Record<string, IDoc>) => {
  while (targetNode) {
    if (targetNode.id === 'root') {
      return true
    }
    if (targetNode.parentId === node.id) {
      return false
    }
    targetNode = targetNode.id === 'root' ? undefined : nodes[targetNode.parentId || 'root']
  }
  return true
}
const Item = observer(({ item, level }: { item: IDoc; level: number }) => {
  const store = useStore()
  const el = useRef<HTMLDivElement>(null)
  const dragOver = useCallback(
    action((e: React.DragEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const container = document.querySelector<HTMLDivElement>('#tree-container')
      if (!container) return
      const scrollTop = container.scrollTop || 0

      const offsetY = e.clientY - container.offsetTop + scrollTop - (el.current?.offsetTop || 0)
      let mode: 'top' | 'bottom' | 'enter' = 'top'

      const state = store.note.state
      if (item.folder) {
        mode = offsetY < 12 ? 'top' : offsetY > 24 ? 'bottom' : 'enter'
      } else {
        mode = offsetY < 24 ? 'top' : 'bottom'
      }
      if (mode === 'enter' && !item.folder && store.note.state.dragStatus) {
        state.dragStatus = null
        return
      }
      const dragNode = state.dragNode
      if (dragNode && !checkChildren(dragNode, item, state.nodes)) {
        state.dragStatus = null
        return
      }
      if (state.dragStatus?.dropNode !== item || state.dragStatus.mode !== mode) {
        state.dragStatus = {
          dropNode: item,
          mode
        }
      }
    }),
    []
  )
  return (
    <Fragment>
      <div
        ref={el}
        data-fid={item.id}
        className={'py-[1px] cursor-pointer'}
        onDragLeave={(e) => e.stopPropagation()}
        onDragOver={dragOver}
      >
        <div
          style={{
            paddingLeft: level * 15
          }}
          className={`rounded group relative ${getClass(store, item)}`}
        >
          <div
            className={`${store.note.state.opendDoc?.id === item.id ? 'dark:text-zinc-100 text-zinc-900' : 'dark:text-zinc-100/80 dark:hover:text-zinc-100/90 text-zinc-600 hover:text-zinc-700'}
           text-sm cursor-default select-none h-7 pr-2 group`}
            style={{ paddingLeft: item.folder ? 2 : 17 }}
            onDragEnd={() => {
              store.note.moveNode()
              el.current!.style.opacity = ''
            }}
            draggable={'true'}
            onDragStart={action((e) => {
              store.note.state.dragNode = item
              el.current!.style.opacity = '0.5'
              // if (item === store.note.state.opendDoc && store.note.state.currentTab.store.docChanged) {
              //   store.note.state.currentTab.store.saveDoc$.next(null)
              // }
            })}
            onContextMenu={(e) => {
              e.preventDefault()
              store.menu.openContextMenu(e, item)
            }}
            onClick={action((e) => {
              e.stopPropagation()
              store.note.state.selectedDoc = item
              if (!item.folder) {
                if (e.metaKey || e.ctrlKey) {
                  store.note.createTab(item)
                } else {
                  store.note.openDoc(item)
                }
              } else {
                item.expand = !item.expand
              }
            })}
          >
            <div
              className={`
            ${item.folder && store.note.state.dragNode?.id !== item.id && store.note.state.dragStatus?.dropNode === item && store.note.state.dragStatus.mode === 'enter' ? 'dark:border-white/30 border-black/30' : 'border-transparent'}
            flex items-center h-full rounded pr-2 border
            `}
            >
              {item.folder && (
                <div className={'w-4 h-full flex items-center justify-center'}>
                  <ChevronRight
                    size={16}
                    strokeWidth={3}
                    className={`dark:text-gray-500 text-gray-400 duration-200 ${item.folder && item.expand ? 'rotate-90' : ''}`}
                  />
                </div>
              )}
              <div
                className={`flex items-center flex-1 h-full relative max-w-full ${store.note.state.opendDoc?.id === item.id ? 'dark:text-white text-black' : ''}`}
                data-entity={'true'}
              >
                <div className={`relative flex-shrink-0`}>
                  {!!item.folder && <FolderClosed size={14} />}
                  {!item.folder && <FileText size={14} />}
                </div>
                <div className={'truncate max-w-full ml-1'}>{item.name || 'Untitled'}</div>
                {store.note.state.dragStatus?.dropNode?.id === item.id &&
                  store.note.state.dragNode?.id !== item?.id &&
                  store.note.state.dragStatus?.mode !== 'enter' && (
                    <div
                      className={`w-full h-0.5 rounded dark:bg-white/30 bg-black/30 absolute right-0 ${store.note.state.dragStatus?.mode === 'top' ? 'top-0' : 'bottom-0'}`}
                    />
                  )}
              </div>
            </div>
          </div>
          {store.note.state.dragNode !== item && (
            <div
              onClick={(e) => {
                store.menu.openContextMenu(e, item)
              }}
              className={`h-6 rounded top-1/2 -mt-3 ${store.note.state.ctxNode?.id === item.id ? 'flex dark:bg-gray-200/20 bg-gray-400/30' : 'hidden group-hover:flex dark:hover:bg-gray-200/20 hover:bg-gray-400/30'}
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

const RenderItem = observer(({ items, level }: { items: IDoc[]; level: number }) => {
  return (
    <>
      {items.map((c) => (
        <Item key={c.id} item={c} level={level} />
      ))}
    </>
  )
})
