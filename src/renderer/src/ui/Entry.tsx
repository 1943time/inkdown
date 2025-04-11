import { useStore } from '@/store/store'
import ChatEntry from './chat/Index'
export default function Entry() {
  const store = useStore()
  const ready = store.settings.useState((state) => state.ready)
  if (!ready) {
    return null
  }
  return <ChatEntry />
}
