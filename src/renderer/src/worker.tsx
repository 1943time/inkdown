import '@ant-design/v5-patch-for-react-19'
import 'react-photo-view/dist/react-photo-view.css'
import 'katex/dist/katex.min.css'
import ReactDOM from 'react-dom/client'
import { observer } from 'mobx-react-lite'
import { ThemeProvider } from 'antd-style'
import { useLayoutEffect, useMemo, useState } from 'react'
import { IChat, IDoc } from 'types/model'
import { Webview } from './editor/ui/Webview'
import { delayRun } from './utils/common'
import { ChatViewList } from './ui/chat/ViewList'

const Worker = observer(() => {
  const dark = useMemo(() => document.documentElement.classList.contains('dark'), [])
  const [doc, setDoc] = useState<IDoc | null>(null)
  const [chat, setChat] = useState<IChat | null>(null)
  useLayoutEffect(() => {
    window.electron.ipcRenderer
      .invoke('get-print-data')
      .then((data: { docId?: string; chatId?: string }) => {
        if (data.docId) {
          window.electron.ipcRenderer.invoke('getDoc', data.docId).then((doc: IDoc) => {
            if (doc) {
              setDoc({
                ...doc,
                schema: JSON.parse(doc.schema as unknown as string)
              })
            }
          })
        }
        if (data.chatId) {
          window.electron.ipcRenderer.invoke('getChat', data.chatId).then((chat: IChat) => {
            if (chat) {
              setChat({
                ...chat,
                messages: chat.messages
                  ? chat.messages.map((m: any) => {
                      return {
                        ...m,
                        files: m.files ? JSON.parse(m.files) : [],
                        context: m.context ? JSON.parse(m.context) : [],
                        docs: m.docs ? JSON.parse(m.docs) : []
                      }
                    })
                  : []
              })
            }
          })
        }
      })
      .finally(() => {
        delayRun(() => {
          window.electron.ipcRenderer.send('print-pdf-ready')
        })
      })
  }, [])
  return (
    <ThemeProvider
      themeMode={dark ? 'dark' : 'light'}
      theme={{
        components: {
          Checkbox: {
            colorBorder: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          },
          Radio: {
            colorBorder: dark ? 'rgba(255, 255, 255, 0.2) ' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      }}
    >
      {doc && (
        <div className={'px-8 h-auto'}>
          <Webview doc={doc} />
        </div>
      )}
      {chat && (
        <div className={'py-8 px-5'}>
          <ChatViewList chat={chat} />
        </div>
      )}
    </ThemeProvider>
  )
})
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Worker />)
