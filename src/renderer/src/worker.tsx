import { ConfigProvider, message, theme } from 'antd'
import './styles/editor.scss'
import 'antd/dist/reset.css'
import { observer } from 'mobx-react-lite'
import { useEffect, useMemo, useState } from 'react'
import { Webview } from './components/Webview'
import ReactDOM from 'react-dom/client'
import { runInAction } from 'mobx'
import { Core, CoreContext } from './store/core'

const App = observer(() => {
  const [ready, setReady] = useState(false)
  const [messageApi] = message.useMessage()
  const core = useMemo(() => new Core(messageApi), [])
  useEffect(() => {
    Promise.allSettled([core.config.initial()]).then(() => {
      runInAction(() => {
        core.config.config.codeAutoBreak = true
      })
      setReady(true)
    })
  }, [])
  if (!ready) return null
  return (
    <CoreContext.Provider value={core}>
      <ConfigProvider
        theme={{
          algorithm: core.config.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#3b82f6'
          }
        }}
      >
        <Webview />
      </ConfigProvider>
    </CoreContext.Provider>
  )
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
