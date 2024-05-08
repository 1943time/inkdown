import {ConfigProvider, theme} from 'antd'
import './styles/editor.scss'
import 'antd/dist/reset.css'
import {observer} from 'mobx-react-lite'
import React, {useEffect, useState} from 'react'
import {configStore} from './store/config'
import {Webview} from './components/Webview'
import ReactDOM from 'react-dom/client'
import {codeReady} from './editor/utils/highlight'

const App = observer(() => {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.allSettled([
      configStore.initial()
    ]).then(async () => {
      await codeReady(true)
      setReady(true)
    })
  }, [])
  if (!ready) return null
  return (
    <ConfigProvider
      theme={{
        algorithm: configStore.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6'
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
