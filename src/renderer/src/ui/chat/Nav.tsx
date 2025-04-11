import { SwitchModel } from './SwitchModel'
import { Ellipsis } from 'lucide-react'
import { useStore } from '@/store/store'
import { IFold } from '@/icons/IFold'

export function Nav() {
  const store = useStore()
  return (
    <div
      className={
        'h-10 flex justify-between items-center font-medium px-3 flex-shrink-0 relative z-10 drag-nav'
      }
    >
      <div
        className={
          'absolute -left-11 top-0 p-1 flex items-center justify-center z-10 h-10 drag-none'
        }
      >
        <div className={'p-1 rounded hover:bg-white/10 duration-200 cursor-pointer'}>
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
            store.settings.useState.setState({ open: true })
          }}
        >
          <Ellipsis />
        </div>
      </div>
    </div>
  )
}
