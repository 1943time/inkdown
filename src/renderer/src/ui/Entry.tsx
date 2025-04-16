import { useStore } from '@/store/store'
import { SideBar } from './sidebar/SideBar'
import { Nav } from './nav/Nav'
import { Chat } from './chat/Chat'
import { Settings } from './settings/Settings'
import { observer } from 'mobx-react-lite'
const Entry = observer(() => {
  const store = useStore()
  const { open, ready } = store.settings.state
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
})

export default Entry
