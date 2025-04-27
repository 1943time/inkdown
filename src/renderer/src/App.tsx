import { useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, ConfigProvider, theme } from 'antd'
import Entry from './ui/Entry'
export default function App() {
  const [messageApi, contextHolder] = message.useMessage()
  const store = useMemo(() => new Store(messageApi), [])
  return (
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
      </StoreContext>
    </ConfigProvider>
  )
}
