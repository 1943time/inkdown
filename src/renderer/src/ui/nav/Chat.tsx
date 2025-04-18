import { observer } from 'mobx-react-lite'
import { SwitchModel } from '../chat/SwitchModel'
import { useStore } from '@/store/store'
import { Ellipsis } from 'lucide-react'

export const ChatNav = observer(() => {
  const store = useStore()
  return (
    <div className={'flex justify-between items-center h-full'}>
      <SwitchModel />
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
