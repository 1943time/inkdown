import { useStore } from '@/store/store'
import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Chats } from './Chats'
import { Bot, PenLine } from 'lucide-react'

export function SideBar() {
  const store = useStore()
  const [sidePanelWidth, fold, win] = store.settings.useState(
    useShallow((state) => [state.sidePanelWidth, state.fold, state.window])
  )
  const move = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX
    document.body.classList.add('drag-sidebar')
    const get = store.settings.useState.getState
    const startWidth = get().sidePanelWidth
    const move = (e: MouseEvent) => {
      let width = startWidth + e.clientX - startX
      if (width > 500) {
        width = 500
      }
      if (width < 200) {
        width = 200
      }
      store.settings.useState.setState({ sidePanelWidth: width })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener(
      'mouseup',
      () => {
        document.body.classList.remove('drag-sidebar')
        store.model.putSetting({ key: 'sidePanelWidth', value: get().sidePanelWidth })
        window.removeEventListener('mousemove', move)
      },
      { once: true }
    )
  }, [])
  return (
    <div
      className={
        'border-r dark:border-white/10 h-full bg-[var(--side-panel-bg-color)] pt-10 overflow-hidden side-move-transition'
      }
      style={{ width: fold ? 0 : sidePanelWidth }}
    >
      <div className={'h-[30px] px-4 mb-4 mt-1'}>
        <div
          className={
            'flex items-center justify-around dark:bg-black/20 h-full rounded-lg text-white/60 relative *:cursor-pointer *:h-full'
          }
        >
          <div
            className={`flex items-center duration-150 relative z-10 justify-center flex-1 ${win === 'chat' ? 'text-black' : 'text-white/70'}`}
            onClick={() => {
              store.settings.useState.setState({ window: 'chat' })
            }}
          >
            <Bot size={20} />
            <span className={'ml-2 text-sm'}>Chat</span>
          </div>
          <div
            className={`flex items-center duration-150 relative z-10 justify-center flex-1 ${win === 'note' ? 'text-black' : 'text-white/70'}`}
            onClick={() => {
              store.settings.useState.setState({ window: 'note' })
            }}
          >
            <PenLine size={20} />
            <span className={'ml-2 text-sm'}>Note</span>
          </div>
          <div
            className={`duration-150 w-1/2 h-full bg-white/80 absolute rounded-lg left-0 top-0 ${win === 'chat' ? '' : 'translate-x-full'}`}
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
      <div style={{ width: sidePanelWidth }}>{win === 'chat' && <Chats />}</div>
    </div>
  )
}
