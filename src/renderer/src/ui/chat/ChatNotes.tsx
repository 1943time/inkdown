import { useStore } from '@/store/store'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
const width = 300
export const ChatNotes = observer(() => {
  const store = useStore()
  const { reference } = store.chat.state
  useEffect(() => {
    if (reference.open) {
      const { x, y, width, height } = reference.domRect!
      console.log('x', x, 'y', y, 'width', width, 'height', height)
    }
  }, [reference.open])
  if (!reference.open) return null
  return <div className="absolute left-0 top-0 z-10">ChatNotes</div>
})
