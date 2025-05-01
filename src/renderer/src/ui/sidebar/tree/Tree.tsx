import { FullSearch } from './FullSearch'
import { TreeRender } from './TreeRender'
import { Trash } from './Trash'
import { ToggleSpace } from './ToogleSpace'
import { useEffect } from 'react'
import { useStore } from '@/store/store'
import { useGetSetState } from 'react-use'
import { observer } from 'mobx-react-lite'
import { Search } from 'lucide-react'

export const Tree = observer(() => {
  const store = useStore()
  const { nodes, view } = store.note.state
  const [state, setState] = useGetSetState({
    scroll: false
  })
  useEffect(() => {
    setState({ scroll: false })
  }, [store.note.state.currentSpace?.id])
  useEffect(() => {
    window.addEventListener('click', (e) => {
      if (store.note.state.selectedDoc) {
        if (!document.querySelector('#tree-content')?.contains(e.target as Node)) {
          store.note.setState({ selectedDoc: null })
        }
      }
    })
  }, [nodes])
  if (!nodes['root']) return null
  return (
    <div className={`h-full width-duration duration-200`}>
      <div className={'h-full flex flex-col'}>
        <div className={'flex-1 flex-shrink-0 overflow-hidden flex flex-col'}>
          <ToggleSpace />
          <div className={'px-2'}>
            <div
              onClick={() => {
                store.note.setState({ view: 'search' })
              }}
              className={
                'flex items-center dark:hover:bg-white/5 hover:bg-black/5 rounded-lg py-1.5 px-2 cursor-pointer duration-200 font-medium'
              }
            >
              <Search size={16} />
              <span className={'ml-2 text-[13px] leading-5'}>Search</span>
            </div>
          </div>
          <div className={`flex-1 flex-shrink-0 h-0`}>
            <div className={`${view === 'search' ? '' : 'hidden'} h-full`}>
              <FullSearch />
            </div>
            <div className={`${view === 'folder' ? 'h-full flex flex-col' : 'hidden'}`}>
              <div
                className={`relative h-full pt-1 overflow-y-auto flex-1 border-t ${state().scroll ? 'dark:border-white/10 border-gray-600/10' : 'border-transparent'}`}
                id={'tree-container'}
                onContextMenu={(e) => {
                  store.menu.openContextMenu(e, store.note.state.root)
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
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onDragLeave={() => {
                    store.note.setState({ dragStatus: null })
                  }}
                >
                  <TreeRender />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Trash />
      </div>
    </div>
  )
})
