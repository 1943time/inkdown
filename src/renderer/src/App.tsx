import { ConfigProvider, message, Modal, theme } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSubject } from './hooks/subscribe'
import { message$, modal$ } from './utils'
import { Home } from './components/Home'
import zhCN from 'antd/locale/zh_CN'
import { db } from './store/db'
import { Core, CoreContext } from './store/core'

const App = observer(() => {
  const [messageApi, contextHolder] = message.useMessage()
  const core = useMemo(() => new Core(messageApi), [])
  const [modal, modalContext] = Modal.useModal()
  const [locale, setLocale] = useState('en')
  useSubject(message$, (args) => {
    args === 'destroy' ? messageApi.destroy() : messageApi.open(args)
  })

  useSubject(modal$, (args) => {
    modal[args.type](args.params)
  })
  const [ready, setReady] = useState(false)
  const initial = useCallback(async () => {
    await core.config.initial()
    if (core.config.config.autoOpenSpace) {
      const spaces = await db.space.toArray()
      const lastOpenSpace = spaces.sort((a, b) => (a.lastOpenTime > b.lastOpenTime ? -1 : 1))[0]
      if (lastOpenSpace) {
        await core.tree.initial(lastOpenSpace.cid)
      }
    }
    if (!localStorage.getItem('v1.3.0')) {
      localStorage.setItem('v1.3.0', 'true')
      await db.file.clear()
    }
    setLocale(core.config.zh ? 'zh' : 'en')
    setReady(true)
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.invoke('open-space', '')
    initial()
  }, [])
  const themeObject = useMemo(() => {
    return core.config.config.dark ? theme.darkAlgorithm : theme.defaultAlgorithm
  }, [core.config.config.dark])
  if (!ready) return null
  return (
    <CoreContext.Provider value={core}>
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
    </CoreContext.Provider>
  )
})

export default App
