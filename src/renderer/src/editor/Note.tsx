import { useStore } from '@/store/store'
import { observer } from 'mobx-react-lite'
import { Tabs } from './ui/Tabs'
import { EditorFrame } from './EditorFrame'

export const Note = observer(() => {
  const store = useStore()
  return (
    <div
      style={{
        minWidth: 420,
        maxWidth: '100%'
      }}
    >
      {!!store.note.state.currentSpace && (
        <div className={`flex-col w-full h-[calc(100vh_-_40px)] relative flex`}>
          <Tabs />
          <>
            {store.note.state.tabs.map((t, i) => (
              <div
                className={`flex-1 overflow-x-hidden items-start ${store.note.state.tabIndex === i ? 'h-full' : 'opacity-0 fixed w-0 h-0 pointer-events-none'}`}
                style={{
                  contentVisibility: store.note.state.tabIndex === i ? 'inherit' : 'hidden'
                }}
                key={i}
              >
                <EditorFrame tab={t} />
              </div>
            ))}
          </>
          {/* <Tools /> */}
          {/* <Characters /> */}
        </div>
      )}
    </div>
  )
})
