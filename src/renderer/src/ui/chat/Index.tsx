import { Chat } from '@/ui/chat/Chat'
import { Settings } from '../../ui/settings/Settings'
import { Nav } from '@/ui/chat/Nav'
import { useStore } from '@/store/store'
import { ChatsPanel } from '../chat/ChatsPanel/ChatsPanel'
export default function ChatEntry() {
  const store = useStore()
  const open = store.settings.useState((state) => state.open)
  return (
    <div className={'flex h-screen'}>
      <div className={'sidebar flex-shrink-0'}>
        <ChatsPanel />
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
