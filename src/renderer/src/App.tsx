import { useEffect, useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, Modal, notification, Space } from 'antd'
import { Button, ThemeProvider } from '@lobehub/ui'
import Entry from './ui/Entry'
import { observer } from 'mobx-react-lite'

const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const [modalApi, modalContextHolder] = Modal.useModal()
  const [notifyApi, notifyContextHolder] = notification.useNotification()
  const store = useMemo(() => {
    const store = new Store({
      msg: messageApi,
      modal: modalApi
    })
    store.note.init()
    return store
  }, [])
  useEffect(() => {
    store.system.onIpcMessage('update-ready', () => {
      notifyApi.info({
        message: '有新的版本可用，是否立即更新？',
        actions: (
          <Space>
            <Button type="link" size="small" onClick={() => notifyApi.destroy()}>
              关闭
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                store.system.updateAndRestart()
                notifyApi.destroy()
              }}
            >
              立即更新
            </Button>
          </Space>
        )
      })
    })
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
        {notifyContextHolder}
        <Entry />
      </StoreContext>
    </ThemeProvider>
  )
})

export default App
