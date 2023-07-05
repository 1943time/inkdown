import {ConfigProvider, message, theme} from 'antd'
import {useSubject} from './hooks/subscribe'
import {createHashRouter, RouterProvider,} from 'react-router-dom'
import {Home} from './components/Home'
import {Webview} from './components/Webview'
import {observer} from 'mobx-react-lite'
import {useEffect, useMemo, useState} from 'react'
import {configStore} from './store/config'
import zhCN from 'antd/locale/zh_CN';
import {message$} from './utils'

const router = createHashRouter([
  {
    path: '/',
    element: <Home/>
  },
  {
    path: '/webview',
    element: <Webview/>
  }
])

const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  useSubject(message$, args => {
    messageApi.open(args)
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
      locale={zhCN}
      theme={{
        algorithm: themeObject,
        token: {
          colorPrimary: '#0ea5e9'
        }
      }}
    >
      {contextHolder}
      <RouterProvider router={router}/>
    </ConfigProvider>
  )
})

export default App
