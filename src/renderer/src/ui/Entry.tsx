import { useStore } from '@/store/store'
import { SideBar } from './sidebar/SideBar'
import { Nav } from './Nav'
import { Chat } from './chat/Chat'
import { Settings } from './settings/Settings'
import { observer } from 'mobx-react-lite'
import { ConfirmDialog } from './dialog/ConfirmDialog'
import { EditFolderDialog } from './sidebar/tree/EditFolderDialog'
import { EditSpace } from './space/EditSpace'
import { Note } from '@/editor/Note'
import { useCallback } from 'react'
const Entry = observer(() => {
  const store = useStore()
  const { open, ready } = store.settings.state
  const move = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    document.body.classList.add('drag-sidebar')
    const startWidth = store.settings.state.sidePanelWidth
    const move = (e: MouseEvent) => {
      let width = startWidth + e.clientX - startX
      if (width > 500) {
        width = 500
      }
      if (width < 200) {
        width = 200
      }
      store.settings.setState({ sidePanelWidth: width })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener(
      'mouseup',
      () => {
        document.body.classList.remove('drag-sidebar')
        store.settings.setSetting('sidePanelWidth', store.settings.state.sidePanelWidth)
        window.removeEventListener('mousemove', move)
      },
      { once: true }
    )
  }, [])
  if (!ready) {
    return null
  }
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
          {open && <Settings />}
        </div>
      </div>
      <Chat />
      <ConfirmDialog />
      <EditFolderDialog />
      <EditSpace />
    </div>
  )
})

export default Entry
