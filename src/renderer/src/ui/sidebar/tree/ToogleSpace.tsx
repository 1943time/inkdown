import { Popover } from 'antd'
import { SpaceItem } from '@/ui/space/SpaceItem'
import { useCallback } from 'react'
import { arrayMoveImmutable } from 'array-move'
import { Icon } from '@iconify/react'
import SortableList, { SortableItem } from 'react-easy-sort'
import { Plus, Settings } from 'lucide-react'
import { useStore } from '@/store/store'
import { useGetSetState } from 'react-use'
import { useShallow } from 'zustand/react/shallow'
import { ISpace } from 'types/model'
export function SpaceList(props: {
  spaces: ISpace[]
  onClick: (id: string) => void
  onMove?: (oldIndex: number, newIndex: number) => void
  chrome?: boolean
}) {
  const store = useStore()
  const move = useCallback(({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    if (oldIndex !== newIndex) {
      if (props.onMove) {
        props.onMove?.(oldIndex, newIndex)
      } else {
        // runInAction(() => {
        //   core.service.spaces = arrayMoveImmutable(core.service.spaces, oldIndex, newIndex)
        // })
        // core.service.spaces.map((s, i) => db.space.update(s.cid, { sort: i }))
        // core.api.sortSpaces.mutate({
        //   cids: core.service.spaces.map((m) => m.cid)
        // })
      }
    }
  }, [])
  return (
    <SortableList
      className={`overflow-y-auto max-h-[200px] relative`}
      id={'space-container'}
      draggedItemClassName={'z-[2100]'}
      onSortEnd={(oldIndex: number, newIndex: number) => {
        move({ oldIndex, newIndex })
      }}
    >
      {props.spaces.map((s, i) => (
        <SortableItem key={s.id}>
          <div key={s.id} className={'select-none'}>
            <SpaceItem
              item={s}
              onClick={() => {
                props.onClick(s.id)
              }}
            />
          </div>
        </SortableItem>
      ))}
    </SortableList>
  )
}
export function ToggleSpace() {
  const [state, setState] = useGetSetState({
    open: false,
    dragging: '',
    fullScreen: false,
    dragIndex: 0,
    dragStatus: null as {
      index: number
      mode: 'top' | 'bottom'
    } | null
  })
  const store = useStore()
  const [spaces] = store.note.useState(useShallow((state) => [state.spaces]))
  const space = store.note.useSpace()
  return (
    <div className={`h-9 mb-1`}>
      <Popover
        trigger={['click']}
        placement={'bottomLeft'}
        overlayClassName={'light-poppver'}
        arrow={false}
        open={state().open}
        onOpenChange={(v) => {
          setState({ open: v })
        }}
        overlayInnerStyle={{ padding: 0 }}
        forceRender={true}
        content={
          <div
            className={'w-80 py-1'}
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
            {!!spaces.length && (
              <SpaceList
                spaces={spaces}
                onClick={(cid) => {
                  store.note.selectSpace(cid)
                  setState({ open: false })
                }}
              />
            )}
            <div className={'h-[1px] my-1 bg-gray-200/70 dark:bg-gray-100/10'}></div>
            <div className={'text-sm px-1'}>
              <div
                onClick={() => {
                  // editSpace$.next(core.tree.root!.cid)
                  setState({ open: false })
                }}
                className={`flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded`}
              >
                <Settings />
                <span className={'text-xs ml-2'}>Workspace Settings</span>
              </div>
              <div
                onClick={() => {
                  setState({ open: false })
                }}
                className={
                  'flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded'
                }
              >
                <Plus />
                <span className={'text-xs ml-2'}>Create Workspace</span>
              </div>
            </div>
          </div>
        }
      >
        <div
          className={
            'pl-2 pr-1 h-full flex items-center justify-between text-sm duration-200 rounded-lg dark:hover:bg-white/5 hover:bg-black/5 cursor-pointer'
          }
        >
          <div className={'flex items-center'}>
            <div
              className={`text-white flex-shrink-0 w-6 h-6 rounded space-${space?.background || 'sky'} flex items-center justify-center  font-medium`}
            >
              {space?.name.slice(0, 1).toUpperCase()}
            </div>
            <div className={'ml-2 max-w-full truncate text-[13px]'}>{space?.name}</div>
          </div>
          <div>
            <Icon
              icon={'ic:round-unfold-more'}
              className={'text-lg ml-1 flex-shrink-0 text-gray-500 dark:text-gray-400'}
            />
          </div>
        </div>
      </Popover>
    </div>
  )
}
