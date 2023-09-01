import {ConfigProvider, message, theme} from 'antd'
import {observer} from 'mobx-react-lite'
import {useEffect, useMemo, useState} from 'react'
import { useSubject } from './hooks/subscribe'
import { configStore } from './store/config'
import { message$ } from './utils'
import { Home } from './components/Home'
const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  useSubject(message$, args => {
    args === 'destroy' ? messageApi.destroy() : messageApi.open(args)
  })
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.allSettled([
      window.api.ready(),
      configStore.initial()
    ]).then(() => {
      setReady(true)
    })
  }, [])
  const themeObject = useMemo(() => {
    return configStore.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm
  }, [configStore.config.dark])
  if (!ready) return null
  return (
    <ConfigProvider
      theme={{
        algorithm: themeObject,
        token: {
          colorPrimary: '#0ea5e9'
        }
      }}
    >
      {contextHolder}
      <Home/>
    </ConfigProvider>
  )
})

export default App
