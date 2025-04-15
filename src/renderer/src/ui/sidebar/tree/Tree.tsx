import { Skeleton } from 'antd'
import { FullSearch } from './FullSearch'
import { TreeRender } from './TreeRender'
import { Trash } from './Trash'
import { ToggleSpace } from './ToogleSpace'
import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { useGetSetState } from 'react-use'
import { useShallow } from 'zustand/react/shallow'

export function Tree() {
  const store = useStore()
  const [root, view] = store.note.useState(useShallow((state) => [state.nodes['root'], state.view]))
  const [state, setState] = useGetSetState({
    scroll: false
  })
  useEffect(() => {
    setState({ scroll: false })
  }, [root?.id])
  return (
    <div className={`h-full width-duration relative duration-200`}>
      <div className={'h-full flex flex-col'}>
        <ToggleSpace />
        <div className={`flex-1 h-0 flex-shrink-0`}>
          <div className={`${view === 'search' ? '' : 'hidden'} h-full`}>
            <FullSearch />
          </div>
          <div className={`${view === 'folder' ? 'h-full flex flex-col' : 'hidden'}`}>
            <div
              className={`flex flex-col pt-1 overflow-y-auto flex-1 border-t h-0 ${state().scroll ? 'dark:border-white/10 border-gray-600/10' : 'border-transparent'}`}
              id={'tree-container'}
              onContextMenu={(e) => {
                // core.menu.openContextMenu(e, core.tree.root!)
              }}
              onScroll={(e) => {
                const target = e.target as HTMLDivElement
                if (target.scrollTop > 0 && !state().scroll) {
                  setState({ scroll: true })
                }
                if (target.scrollTop === 0 && state().scroll) {
                  setState({ scroll: false })
                }
              }}
            >
              <div
                className={`${view === 'folder' ? '' : 'hidden'} pb-20`}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => {
                  store.note.useState.setState({ dragStatus: null })
                }}
              >
                <div
                  className={`${view === 'folder' ? '' : 'hidden'}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <div>
                    <TreeRender />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Trash />
      </div>
    </div>
  )
}
