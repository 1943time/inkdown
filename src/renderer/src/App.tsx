import { useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, Modal } from 'antd'
import { ThemeProvider } from '@lobehub/ui'
import Entry from './ui/Entry'
import { observer } from 'mobx-react-lite'

const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContextHolder] = Modal.useModal()
  const store = useMemo(() => {
    const store = new Store({
      msg: messageApi,
      modal: modalApi
    })
    store.note.init()
    return store
  }, [])
  if (!store.settings.state.ready) {
    return null
  }
  return (
    <ThemeProvider
      themeMode={store.settings.state.dark ? 'dark' : 'light'}
      theme={{
        components: {
          Checkbox: {
            colorBorder: store.settings.state.dark
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.2)'
          },
          Radio: {
            colorBorder: store.settings.state.dark
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.2)'
          }
        }
      }}
    >
      <StoreContext value={store}>
        {contextHolder}
        {modalContextHolder}
        <Entry />
      </StoreContext>
    </ThemeProvider>
  )
})

export default App
