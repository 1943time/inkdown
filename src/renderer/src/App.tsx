import { useMemo } from 'react'
import { Store, StoreContext } from './store/store'
import { message, ConfigProvider, theme, ThemeConfig } from 'antd'
import Entry from './ui/Entry'
import { observer } from 'mobx-react-lite'

const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const store = useMemo(() => new Store(messageApi), [])
  const themeData = useMemo((): ThemeConfig => {
    if (store.settings.state.dark) {
      return {
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
          },
          Radio: {
            colorPrimary: 'oklch(62.3% 0.214 259.815)',
            colorPrimaryHover: 'oklch(70.7% 0.165 254.624)'
          }
        }
      }
    }
    return {
      algorithm: theme.defaultAlgorithm
    }
  }, [store.settings.state.dark])

  if (!store.settings.state.ready) {
    return null
  }
  return (
    <ConfigProvider theme={themeData}>
      <StoreContext value={store}>
        {contextHolder}
        <Entry />
      </StoreContext>
    </ConfigProvider>
  )
})

export default App
