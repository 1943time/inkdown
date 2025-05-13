import '@ant-design/v5-patch-for-react-19'
import 'react-photo-view/dist/react-photo-view.css'
import 'katex/dist/katex.min.css'
import ReactDOM from 'react-dom/client'
import { observer } from 'mobx-react-lite'
import { ThemeProvider } from 'antd-style'
import { useLayoutEffect, useMemo, useState } from 'react'
import { IDoc } from 'types/model'
import { Webview } from './editor/Webview'
import { delayRun } from './utils/common'

const Worker = observer(() => {
  const dark = useMemo(() => document.documentElement.classList.contains('dark'), [])
  const [doc, setDoc] = useState<IDoc | null>(null)
  useLayoutEffect(() => {
    window.electron.ipcRenderer.invoke('get-print-data').then((data: { docId: string }) => {
      window.electron.ipcRenderer.invoke('getDoc', data.docId).then((doc: IDoc) => {
        if (doc) {
          setDoc({
            ...doc,
            schema: JSON.parse(doc.schema as unknown as string)
          })
        }
      })
    })
    delayRun(() => {
      window.electron.ipcRenderer.send('print-pdf-ready')
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
    </ThemeProvider>
  )
})
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Worker />)
