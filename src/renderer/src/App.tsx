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
          colorPrimary: '#fff'
        },
        components: {
          Button: {
            primaryColor: '#000'
          },
          Checkbox: {
            colorPrimary: 'oklch(62.3% 0.214 259.815)',
            colorPrimaryHover: 'oklch(70.7% 0.165 254.624)'
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
