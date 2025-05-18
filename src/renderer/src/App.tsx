import { useEffect, useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, Modal, notification, Space } from 'antd'
import { Button, ThemeProvider } from '@lobehub/ui'
import Entry from './ui/Entry'
import { observer } from 'mobx-react-lite'
import { useTranslation } from 'react-i18next'

const App = observer(() => {
  const { t } = useTranslation()
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
        message: t('updateApp.available'),
        actions: (
          <Space>
            <Button type="link" size="small" onClick={() => notifyApi.destroy()}>
              {t('close')}
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                store.system.updateAndRestart()
                notifyApi.destroy()
              }}
            >
              {t('updateApp.now')}
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
