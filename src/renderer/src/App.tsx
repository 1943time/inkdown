import {ConfigProvider, message, Modal, theme} from 'antd'
import {observer} from 'mobx-react-lite'
import {useEffect, useMemo, useState} from 'react'
import { useSubject } from './hooks/subscribe'
import { configStore } from './store/config'
import {message$, modal$} from './utils'
import { Home } from './components/Home'
import zhCN from 'antd/locale/zh_CN';

import {codeReady} from './editor/utils/highlight'
const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContext] = Modal.useModal()
  const [locale, setLocale] = useState('en')
  useSubject(message$, args => {
    args === 'destroy' ? messageApi.destroy() : messageApi.open(args)
  })

  useSubject(modal$, args => {
    modal[args.type](args.params)
  })

  const [ready, setReady] = useState(false)
  useEffect(() => {
    Promise.all([
      configStore.initial(),
    ]).then(async () => {
      await codeReady()
      setLocale(configStore.zh ? 'zh' : 'en')
      setReady(true)
    })
  }, [])
  const themeObject = useMemo(() => {
    return configStore.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm
  }, [configStore.config.dark])
  if (!ready) return null
  return (
    <ConfigProvider
      locale={locale === 'zh' ? zhCN : undefined}
      theme={{
        algorithm: themeObject,
        token: {
          colorPrimary: '#6366f1'
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
