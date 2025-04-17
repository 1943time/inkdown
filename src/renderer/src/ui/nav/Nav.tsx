import { SwitchModel } from '../chat/SwitchModel'
import { Ellipsis } from 'lucide-react'
import { useStore } from '@/store/store'
import { IFold } from '@/icons/IFold'
import { useShallow } from 'zustand/react/shallow'
import { os } from '@/utils/common'
import { useMemo } from 'react'
import { observer } from 'mobx-react-lite'
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
  return (
    <div
      style={{
        paddingLeft: navLeft
      }}
      className={
        'h-10 flex justify-between items-center font-medium px-3 flex-shrink-0 relative z-10 drag-nav side-move-transition'
      }
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
      <SwitchModel />
      <div className={'drag-none'}>
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
