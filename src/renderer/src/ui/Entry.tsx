import { useStore } from '@/store/store'
import { SideBar } from './sidebar/SideBar'
import { Nav } from './nav/Nav'
import { Chat } from './chat/Chat'
import { Settings } from './settings/Settings'
import { useShallow } from 'zustand/react/shallow'
export default function Entry() {
  const store = useStore()
  const [open, ready] = store.settings.useState(useShallow((state) => [state.open, state.ready]))
  if (!ready) {
    return null
  }
  return (
    <div className={'flex h-screen'}>
      <div className={'sidebar flex-shrink-0'}>
        <SideBar />
      </div>
      <div className={'flex-1 relative flex flex-col'}>
        <Nav />
        <div className={'flex-1 relative h-[calc(100vh_-_40px)]'}>
          <Chat />
          {open && <Settings />}
        </div>
      </div>
    </div>
  )
}
