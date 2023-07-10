import {ConfigProvider, theme} from 'antd'
import './styles/editor.scss'
import 'antd/dist/reset.css'
import {observer} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {configStore} from './store/config'
import zhCN from 'antd/locale/zh_CN';
import {Webview} from './components/Webview'
import ReactDOM from 'react-dom/client'

const App = observer(() => {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.allSettled([
      window.api.ready(),
      configStore.initial()
    ]).then(() => {
      setReady(true)
    })
  }, [])
  if (!ready) return null
  return (
    <ConfigProvider
      locale={configStore.isZh ? zhCN : undefined}
      theme={{
        algorithm: configStore.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0ea5e9'
        }
      }}
    >
      <Webview/>
    </ConfigProvider>
  )
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
