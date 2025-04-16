import { useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, ConfigProvider, theme } from 'antd'
import Entry from './ui/Entry'
import { ConfirmDialog } from './ui/dialog/ConfirmDialog'
import { ThemeProvider } from '@lobehub/ui'
export default function App() {
  const [messageApi, contextHolder] = message.useMessage()
  const store = useMemo(() => new Store(messageApi), [])
  return (
    <ThemeProvider themeMode={'dark'}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#fff',
            colorPrimaryText: '#000'
          },
          components: {
            Button: {
              colorTextBase: '#000'
            }
          }
        }}
      >
        <StoreContext value={store}>
          {contextHolder}
          <Entry />
          <ConfirmDialog />
        </StoreContext>
      </ConfigProvider>
    </ThemeProvider>
  )
}
