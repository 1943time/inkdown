import {observer} from 'mobx-react-lite'
import {Tree} from './tree/Tree'
import {Nav} from './Nav'
import {treeStore} from '../store/tree'
import {EditorFrame} from '../editor/EditorFrame'
import {useCallback, useEffect, useRef} from 'react'
import {MainApi} from '../api/main'
import {existsSync} from 'fs'
import {Set} from './Set'
import {About} from '../About'
import {exportHtml} from '../editor/output/html'
import {Characters} from './Characters'
import {ExportEbook} from './ExportEbook'
import {Webview} from './Webview'
export const Home = observer(() => {
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
      if (treeStore.openNote && treeStore.openNote.ext === 'md') {
        window.electron.ipcRenderer.send('print-pdf', treeStore.openNote!.filePath, treeStore.root?.filePath)
      }
    }
    const printHtml = () => {
      MainApi.sendToSelf('window-blur')
      if (treeStore.openNote && treeStore.openNote.ext === 'md') exportHtml(treeStore.openNote)
    }
    initial()
    window.electron.ipcRenderer.on('open', open)
    window.electron.ipcRenderer.on('create', create)
    window.electron.ipcRenderer.on('call-print-pdf', printPdf)
    window.electron.ipcRenderer.on('print-to-html', printHtml)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('call-print-pdf', printPdf)
      window.electron.ipcRenderer.removeListener('print-to-html', printHtml)
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
        <Characters/>
      </div>
      <About/>
      <Set/>
      <ExportEbook/>
    </div>
  )
})
