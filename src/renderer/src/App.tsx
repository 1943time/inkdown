import {ConfigProvider, message, Modal, theme} from 'antd'
import {observer} from 'mobx-react-lite'
import {useEffect, useMemo, useState} from 'react'
import { useSubject } from './hooks/subscribe'
import { configStore } from './store/config'
import {message$, modal$} from './utils'
import { Home } from './components/Home'
import zhCN from 'antd/locale/zh_CN';
const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContext] = Modal.useModal()
  useSubject(message$, args => {
    args === 'destroy' ? messageApi.destroy() : messageApi.open(args)
  })

  useSubject(modal$, args => {
    modal[args.type](args.params)
  })

  const locale = useMemo(() => {
    return configStore.zh ? zhCN : undefined
  }, [])

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
      locale={locale}
      theme={{
        algorithm: themeObject,
        token: {
          colorPrimary: '#0ea5e9'
        }
      }}
    >
      {contextHolder}
      {modalContext}
      <Home/>
    </ConfigProvider>
  )
})

export default App
