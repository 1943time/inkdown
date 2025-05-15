import { useStore } from '@/store/store'
import { observer } from 'mobx-react-lite'
import { Tabs } from './ui/Tabs'
import { EditorFrame } from './EditorFrame'
import { Characters } from './ui/Characters'
import { QuickOpen } from './ui/QuickOpen'
import { PhotoSlider } from 'react-photo-view'
import { History } from './ui/History'

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
          <Characters />
          <QuickOpen />
          <PhotoSlider
            maskOpacity={0.5}
            className={'desktop-img-view'}
            images={
              store.note.state.previewImage.images.map((item) => ({
                src: item.src,
                key: item.src
              })) || []
            }
            visible={store.note.state.previewImage.open}
            onClose={() => {
              store.note.setState((state) => {
                state.previewImage.open = false
              })
            }}
            index={store.note.state.previewImage.index}
            onIndexChange={(i) => {
              store.note.setState((state) => {
                state.previewImage.index = i
              })
            }}
          />
          <History
            doc={store.note.state.opendDoc}
            open={store.note.state.openHistory}
            onClose={() => {
              store.note.setState({ openHistory: false })
            }}
          />
        </div>
      )}
    </div>
  )
})
