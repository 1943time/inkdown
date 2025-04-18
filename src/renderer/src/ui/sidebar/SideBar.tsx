import { useStore } from '@/store/store'
import { useCallback } from 'react'
import { Chats } from './Chats'
import { Bot, PenLine } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Tree } from './tree/Tree'
export const SideBar = observer(() => {
  const store = useStore()
  const { sidePanelWidth, foldSideBar: fold, view } = store.settings.state
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
        'border-r dark:border-white/10 bg-[var(--side-panel-bg-color)] pt-10 overflow-hidden side-move-transition flex flex-col h-full'
      }
      style={{ width: fold ? 0 : sidePanelWidth }}
    >
      <div className={'h-7 px-4 mb-4 mt-1 flex-shrink-0'} style={{ width: sidePanelWidth }}>
        <div
          className={
            'flex items-center justify-around dark:bg-black/30 h-full rounded-lg text-white/60 relative *:cursor-pointer *:h-full font-medium'
          }
        >
          <div
            className={`flex items-center duration-150 relative z-10 justify-center flex-1 ${view === 'note' ? 'text-black' : 'text-white/70'}`}
            onClick={() => {
              store.settings.setSetting('view', 'note')
            }}
          >
            <PenLine size={16} />
            <span className={'ml-2 text-sm'}>Note</span>
          </div>
          <div
            className={`flex items-center duration-150 relative z-10 justify-center flex-1 ${view === 'chat' ? 'text-black' : 'text-white/70'}`}
            onClick={() => {
              store.settings.setSetting('view', 'chat')
            }}
          >
            <Bot size={16} />
            <span className={'ml-2 text-sm'}>Chat</span>
          </div>
          <div
            className={`duration-150 w-1/2 h-full bg-white/80 absolute rounded-lg left-0 top-0 ${view === 'note' ? '' : 'translate-x-full'}`}
          />
        </div>
      </div>
      <div
        className={'fixed w-1 h-screen top-0 z-10 cursor-col-resize'}
        style={{
          left: sidePanelWidth - 2
        }}
        onMouseDown={move}
      />
      <div style={{ width: sidePanelWidth }} className={'flex-1 flex-shrink-0 min-h-0'}>
        <div
          className={`h-full ${view === 'chat' ? '' : 'opacity-0 fixed w-0 h-0 pointer-events-none'}`}
        >
          <Chats />
        </div>
        <div
          className={`h-full ${view === 'note' ? '' : 'opacity-0 fixed w-0 h-0 pointer-events-none'}`}
        >
          <Tree />
        </div>
      </div>
    </div>
  )
})
