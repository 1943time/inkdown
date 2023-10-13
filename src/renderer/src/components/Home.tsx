import {observer} from 'mobx-react-lite'
import {Tree} from './tree/Tree'
import {Nav} from './Nav'
import {treeStore} from '../store/tree'
import {EditorFrame} from '../editor/EditorFrame'
import {useCallback, useEffect} from 'react'
import {MainApi} from '../api/main'
import {existsSync} from 'fs'
import {Set} from './Set'
import {About} from '../About'
import {Characters} from './Characters'
import {clearExpiredRecord, db} from '../store/db'
import {QuickOpen} from './QuickOpen'
import {action} from 'mobx'
import {exportHtml} from '../editor/output/html'
import {History} from './History'

export const Home = observer(() => {
  const initial = useCallback(async () => {
    window.electron.ipcRenderer.invoke('get-win-set').then(res => {
      if (res) {
        const {openFile, openFolder} = res
        try {
          if (openFolder && existsSync(openFolder)) {
            treeStore.open(openFolder, openFile || undefined)
          } else if (openFile && existsSync(openFile)) {
            treeStore.open(openFile)
          }
        } catch (e) {}
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
    const openFile = (e: any) => {
      MainApi.openFile().then(res => {
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
    const clearRecent = () => {
      db.recent.clear()
    }
    initial()
    setTimeout(() => {
      clearExpiredRecord()
    }, 10000)
    window.electron.ipcRenderer.on('open', open)
    window.electron.ipcRenderer.on('open-file', openFile)
    window.electron.ipcRenderer.on('create', create)
    window.electron.ipcRenderer.on('call-print-pdf', printPdf)
    window.electron.ipcRenderer.on('call-print-html', printHtml)
    window.electron.ipcRenderer.on('clear-recent', clearRecent)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('open-file', openFile)
      window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('call-print-pdf', printPdf)
      window.electron.ipcRenderer.removeListener('call-print-html', printHtml)
      window.electron.ipcRenderer.removeListener('clear-recent', clearRecent)
    }
  }, [])
  const moveStart = useCallback((e: React.MouseEvent) => {
    const left = e.clientX
    const startWidth = treeStore.width
    document.documentElement.classList.add('move')
    const move = action((e: MouseEvent) => {
      let width = startWidth + (e.clientX - left)
      if (width < 220) width = 220
      if (width > 500) width = 500
      treeStore.width = width
    })
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', () => {
      window.removeEventListener('mousemove', move)
      document.documentElement.classList.remove('move')
      localStorage.setItem('tree-width', String(treeStore.width))
    }, {once: true})
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.send('open-file', treeStore.openNote && treeStore.openNote.ext === 'md')
  }, [treeStore.openNote])

  return (
    <div className={'flex h-screen overflow-hidden'}>
      <Tree/>
      <div
        className={'fixed w-1 bg-transparent z-[200] left-0 top-0 h-screen -ml-0.5 cursor-col-resize select-none'}
        style={{left: treeStore.width}}
        onMouseDown={moveStart}
      />
      <div className={'flex-1 overflow-hidden flex flex-col pt-10 relative'}>
        <Nav/>
        {treeStore.tabs.map((t) =>
          <EditorFrame tab={t} key={t.id}/>
        )}
        <Characters/>
      </div>
      <About/>
      <Set/>
      <QuickOpen/>
      <History/>
    </div>
  )
})
