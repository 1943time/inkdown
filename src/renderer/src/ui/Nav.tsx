import { useStore } from '@/store/store'
import { IFold } from '@/icons/IFold'
import { os } from '@/utils/common'
import { Fragment, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { Bot, ChevronLeft, ChevronRight, Ellipsis, Plus } from 'lucide-react'
export const Nav = observer(() => {
  const store = useStore()
  const { foldSideBar: fold } = store.settings.state
  const [iconLeft, navLeft] = useMemo(() => {
    const osType = os()
    if (!fold) {
      return [-44, 10]
    }
    return [os() === 'mac' ? 76 : 10, osType === 'mac' ? 120 : 40]
  }, [fold])
  const path = useMemo(() => {
    if (!store.note.state.opendDoc) return []
    return store.note.getDocPath(store.note.state.opendDoc)
  }, [store.note.state.opendDoc])
  return (
    <div
      style={{
        paddingLeft: navLeft
      }}
      className={'h-10 flex-shrink-0 relative z-10 drag-nav side-move-transition '}
    >
      <div
        style={{
          left: iconLeft
        }}
        className={
          'absolute -left-11 top-0 p-1 flex items-center justify-center z-10 h-10 drag-none side-move-transition'
        }
      >
        <div
          className={'p-1 rounded hover:bg-white/10 cursor-pointer'}
          onClick={() => {
            store.settings.setState((state) => {
              state.foldSideBar = !state.foldSideBar
            })
          }}
        >
          <IFold className={'w-[18px] h-[18px] dark:stroke-white/60'} />
        </div>
      </div>
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
        <div className={'drag-none pr-3 space-x-2 flex items-center'}>
          <div
            className={'nav-action'}
            onClick={() => {
              store.settings.setState({ open: true })
            }}
          >
            <Ellipsis size={22} />
          </div>
          <div
            className={`nav-action`}
            onClick={() => {
              store.settings.setSetting('showChatBot', !store.settings.state.showChatBot)
            }}
          >
            <Bot size={18} />
          </div>
        </div>
      </div>
    </div>
  )
})
