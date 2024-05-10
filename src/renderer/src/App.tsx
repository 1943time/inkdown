import {ConfigProvider, message, Modal, theme} from 'antd'
import {observer} from 'mobx-react-lite'
import {useCallback, useEffect, useMemo, useState} from 'react'
import { useSubject } from './hooks/subscribe'
import { configStore } from './store/config'
import {message$, modal$} from './utils'
import { Home } from './components/Home'
import zhCN from 'antd/locale/zh_CN';
import {codeReady} from './editor/utils/highlight'
import { db } from './store/db'
import { treeStore } from './store/tree'

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
  const initial = useCallback(async () => {
    await configStore.initial()
    await codeReady()
    if (configStore.config.autoOpenSpace) {
      const spaces = await db.space.toArray()
      const lastOpenSpace = spaces.sort((a, b) => a.lastOpenTime > b.lastOpenTime ? -1 : 1)[0]
      if (lastOpenSpace) {
        await treeStore.initial(lastOpenSpace.cid)
      }
    }
    setLocale(configStore.zh ? 'zh' : 'en')
    setReady(true)
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.invoke('open-space', '')
    initial()
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
          colorPrimary: '#3b82f6'
        }
      }}
    >
      {contextHolder}
      {modalContext}
      <Home />
    </ConfigProvider>
  )
})

export default App
