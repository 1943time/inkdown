import { useStore } from '@/store/store'
import { useCallback } from 'react'
import { Chats } from './Chats'
import { Bot, PenLine } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Tree } from './tree/Tree'
export const SideBar = observer(() => {
  const store = useStore()
  const { sidePanelWidth, foldSideBar: fold, fullChatBot } = store.settings.state
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
  return (
    <div
      className={
        'border-r dark:border-white/10 border-black/10 bg-sidebar pt-10 overflow-hidden side-move-transition flex flex-col h-full'
      }
      style={{ width: fold ? 0 : sidePanelWidth }}
    >
      <div
        className={'fixed w-1 h-screen top-0 z-10 cursor-col-resize'}
        style={{
          left: sidePanelWidth - 2
        }}
        onMouseDown={move}
      />
      <div style={{ width: sidePanelWidth }} className={'flex-1 flex-shrink-0 min-h-0'}>
        <div className={`h-full`}>
          <Tree />
        </div>
      </div>
    </div>
  )
})
