import { observer } from 'mobx-react-lite'
import { useStore } from '@/store/store'
import { ChevronLeft, ChevronRight, Ellipsis } from 'lucide-react'
import { Fragment, useMemo } from 'react'
export const NoteNav = observer(() => {
  const store = useStore()
  const path = useMemo(() => {
    if (!store.note.state.opendDoc) return []
    return store.note.getDocPath(store.note.state.opendDoc)
  }, [store.note.state.opendDoc])

  return (
    <div className={'flex justify-between items-center h-full'}>
      <div className={'flex items-center flex-1'}>
        <div className={`text-gray-300 flex items-center text-sm select-none`}>
          <div
            className={`duration-200 cursor-pointer p-0.5 rounded drag-none ${
              store.note.state.currentTab?.state.hasPrev
                ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500'
                : 'dark:text-gray-500 text-gray-300'
            }`}
            onClick={() => store.note.navigatePrev()}
          >
            <ChevronLeft size={20} />
          </div>
          <div
            className={`duration-200 cursor-pointer p-0.5 rounded drag-none ${
              store.note.state.currentTab?.state.hasNext
                ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500'
                : 'dark:text-gray-500 text-gray-300'
            }`}
            onClick={() => store.note.navigateNext()}
          >
            <ChevronRight size={20} />
          </div>
        </div>
        <div
          className={
            'hide-scrollbar overflow-x-auto ml-3 dark:text-gray-300 text-gray-500 text-sm flex items-center h-full flex-1 w-0'
          }
        >
          {!!path.length && (
            <>
              {path.map((c, i) => (
                <Fragment key={i}>
                  {i !== 0 && <span className={'mx-2 drag-none'}>/</span>}
                  <span
                    className={`${
                      i === path.length - 1 ? 'dark:text-gray-100 text-gray-600' : ''
                    } inline-block whitespace-nowrap drag-none`}
                  >
                    {i === path.length - 1 ? c.replace(/\.\w+/, '') : c}
                  </span>
                  {i === path.length - 1 && store.note.state.currentTab?.state.docChanged && (
                    <sup className={'ml-0.5'}>*</sup>
                  )}
                </Fragment>
              ))}
            </>
          )}
        </div>
      </div>
      <div className={'drag-none pr-3'}>
        <div
          className={
            'flex items-center justify-center w-7 h-7 rounded hover:bg-white/10 duration-200 cursor-pointer'
          }
          onClick={() => {
            store.settings.setState({ open: true })
          }}
        >
          <Ellipsis />
        </div>
      </div>
    </div>
  )
})
