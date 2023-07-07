import {observer} from 'mobx-react-lite'
import {Tree} from './tree/Tree'
import {Nav} from './Nav'
import {treeStore} from '../store/tree'
import {EditorFrame} from '../editor/EditorFrame'
import {useCallback, useEffect, useRef} from 'react'
import {MainApi} from '../api/main'
import {existsSync} from 'fs'
import WebviewTag = Electron.WebviewTag
import {mediaType} from '../editor/utils/dom'
import {download} from '../utils'
import {Set} from './Set'
import {About} from '../About'
export const Home = observer(() => {
  const view = useRef<WebviewTag>(null)
  const initial = useCallback(async () => {
    window.electron.ipcRenderer.invoke('get-win-set').then(res => {
      const {openFile, openFolder} = res
      if (openFolder && existsSync(openFolder)) {
        treeStore.open(openFolder, openFile || undefined)
      } else if (openFile && existsSync(openFile)) {
        treeStore.open(openFile)
      }
    })
  }, [])
  useEffect(() => {
    const open = (e: any) => {
      MainApi.open(treeStore.root?.filePath).then(res => {
        if (res.filePaths.length) {
          treeStore.open(res.filePaths[0])
          window.electron.ipcRenderer.send('add-recent-path', res.filePaths[0])
        }
      })
    }
    setTimeout(() => {
      // view.current?.openDevTools()
      view.current?.addEventListener('ipc-message', e => {
        if (e.channel === 'print-pdf-ready') {
          view.current?.printToPDF({
            printBackground: true,
            displayHeaderFooter: true,
            margins: {
              marginType: 'custom',
              bottom: 0,
              left: 0,
              top: 0,
              right: 0
            }
          }).then(res => {
            download(res, 'test2.pdf')
          })
        }
      })
    }, 300)
    const create = (e: any) => {
      MainApi.createNewFile({
        defaultPath: treeStore.root?.filePath
      }).then(res => {
        if (res.filePath) {
          treeStore.createNewNote(res.filePath)
        }
      })
    }
    const printPdf = () => {
      MainApi.sendToSelf('window-blur')
      const filePath = treeStore.currentTab.current?.filePath
      if (filePath && mediaType(filePath) === 'markdown') {
        view.current?.send('print-pdf-load', filePath)
      }
    }
    initial()
    window.electron.ipcRenderer.on('open', open)
    window.electron.ipcRenderer.on('create', create)
    window.electron.ipcRenderer.on('print-to-pdf', printPdf)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('print-to-pdf', printPdf)
    }
  }, [])
  return (
    <div className={'flex h-screen overflow-hidden'}>
      <Tree/>
      <div className={'flex-1 overflow-hidden flex flex-col pt-10 relative'}>
        <Nav/>
        {treeStore.tabs.map((t) =>
          <EditorFrame tab={t} key={t.id}/>
        )}
      </div>
      <webview
        ref={view}
        preload={`file://${window.api.preloadUrl}`}
        src={window.api.baseUrl + '/#/webview'}
        className={'w-[500px] h-[500px] relative top-10 hidden'}
        webpreferences={'sandbox=no, nodeIntegration=true, contextIsolation=no'}
      />
      <About/>
      <Set/>
    </div>
  )
})
