import { useStore } from '@/store/store'
import { SideBar } from './sidebar/SideBar'
import { Nav } from './nav/Nav'
import { Chat } from './chat/Chat'
import { Settings } from './settings/Settings'
import { observer } from 'mobx-react-lite'
import { ConfirmDialog } from './dialog/ConfirmDialog'
import { EditFolderDialog } from './sidebar/tree/EditFolderDialog'
import { EditSpace } from './space/EditSpace'
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
      <ConfirmDialog />
      <EditFolderDialog />
      <EditSpace />
    </div>
  )
})

export default Entry
