import { Popover } from 'antd'
import { SpaceItem } from '@/ui/space/SpaceItem'
import { useCallback } from 'react'
import { arrayMoveImmutable } from 'array-move'
import SortableList, { SortableItem } from 'react-easy-sort'
import { Folders, Plus, Settings } from 'lucide-react'
import { useStore } from '@/store/store'
import { useGetSetState } from 'react-use'
import { ISpace } from 'types/model'
import { observer } from 'mobx-react-lite'
import { ISwitch } from '@/icons/ISwitch'
export const SpaceList = observer(
  (props: {
    spaces: ISpace[]
    onClick: (id: string) => void
    onMove?: (oldIndex: number, newIndex: number) => void
    chrome?: boolean
  }) => {
    const store = useStore()
    const move = useCallback(({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      if (oldIndex !== newIndex) {
        if (props.onMove) {
          props.onMove?.(oldIndex, newIndex)
        } else {
          store.note.setState((state) => {
            state.spaces = arrayMoveImmutable(state.spaces, oldIndex, newIndex)
          })
          store.model.sortSpaces(props.spaces.map((s) => s.id))
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
)
export const ToggleSpace = observer(() => {
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
  const { spaces, currentSpace } = store.note.state
  return (
    <div className={`h-8 mb-1 px-2`}>
      <Popover
        trigger={['click']}
        placement={'bottomLeft'}
        classNames={{
          root: 'light-poppver'
        }}
        arrow={false}
        open={state().open}
        onOpenChange={(v) => {
          setState({ open: v })
        }}
        styles={{
          body: {
            padding: 0
          }
        }}
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
                  store.note.openEditSpace$.next(store.note.state.currentSpace?.id || null)
                  setState({ open: false })
                }}
                className={`flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded`}
              >
                <Settings size={15} />
                <span className={'text-xs ml-2'}>Workspace Settings</span>
              </div>
              <div
                onClick={() => {
                  store.note.openEditSpace$.next(null)
                  setState({ open: false })
                }}
                className={
                  'flex items-center h-8 px-2 duration-200 dark:hover:bg-gray-200/10 hover:bg-gray-100 cursor-pointer rounded'
                }
              >
                <Plus size={16} />
                <span className={'text-xs ml-2'}>Create Workspace</span>
              </div>
            </div>
          </div>
        }
      >
        <div
          className={
            'pl-2 pr-1 h-full flex items-center justify-between text-sm duration-200 rounded-lg dark:hover:bg-white/5 hover:bg-black/5 cursor-pointer font-medium'
          }
        >
          <div className={'flex items-center'}>
            <Folders size={16} />
            <div
              className={'ml-2 max-w-full truncate text-[13px] dark:text-white/80 text-black/80'}
            >
              {currentSpace?.name}
            </div>
          </div>
          <div>
            <ISwitch className={'text-lg ml-1 flex-shrink-0 text-gray-500 dark:text-gray-400'} />
          </div>
        </div>
      </Popover>
    </div>
  )
})
