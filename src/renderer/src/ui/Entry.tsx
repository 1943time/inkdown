import { useStore } from '@/store/store'
import { SideBar } from './sidebar/SideBar'
import { Nav } from './Nav'
import { Chat } from './chat/Chat'
import { observer } from 'mobx-react-lite'
import { ConfirmDialog } from './dialog/ConfirmDialog'
import { EditFolderDialog } from './sidebar/tree/EditFolderDialog'
import { EditSpace } from './space/EditSpace'
import { Note } from '@/editor/Note'
import { Settings } from './settings/Settings'
import { ExportSpace } from './space/ExportSpace'
import { ImportFolder } from './space/ImportFolder'
import { SpaceFiles } from './space/Files'
const Entry = observer(() => {
  const store = useStore()
  return (
    <div className={`flex h-screen`}>
      <div
        className={`sidebar flex-shrink-0  ${!store.settings.state.fullChatBot ? '' : 'invisible opacity-0 w-0 h-0 absolute left-0 top-0 pointer-events-none'}`}
      >
        <SideBar />
      </div>
      <div
        className={`flex-1 flex flex-col w-0 min-w-0 ${!store.settings.state.fullChatBot ? 'relative' : 'invisible opacity-0 w-0 h-0 absolute left-0 top-0 pointer-events-none'}`}
      >
        <Nav />
        <div className={'flex-1 relative h-[calc(100vh_-_40px)]'}>
          <div className={`h-full`}>
            <Note />
          </div>
        </div>
      </div>
      <Chat />
      <ConfirmDialog />
      <EditFolderDialog />
      <EditSpace />
      <Settings />
      <ExportSpace />
      <ImportFolder />
      <SpaceFiles />
    </div>
  )
})

export default Entry
