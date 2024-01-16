import {observer} from 'mobx-react-lite'
import {Tree} from './tree/Tree'
import {Nav} from './Nav'
import {treeStore} from '../store/tree'
import {EditorFrame} from '../editor/EditorFrame'
import {useCallback, useEffect} from 'react'
import {Set} from './Set'
import {About} from '../About'
import {Characters} from './Characters'
import {QuickOpen} from './QuickOpen'
import {action} from 'mobx'
import {History} from './History'
import {useSystemMenus} from '../hooks/menu'
import {Tabs} from './Tabs'
import {isWindows} from '../utils'
import {ConfirmDialog} from './ConfirmDialog'

export const Home = observer(() => {
  useSystemMenus()
  const moveStart = useCallback((e: React.MouseEvent) => {
    const left = e.clientX
    const startWidth = treeStore.width
    document.documentElement.classList.add('move')
    const move = action((e: MouseEvent) => {
      let width = startWidth + (e.clientX - left)
      if (width < 240) width = 240
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
    window.electron.ipcRenderer.send('open-file', treeStore.openedNote && treeStore.openedNote.ext === 'md')
  }, [treeStore.openedNote])
  return (
    <div className={`flex h-screen overflow-hidden ${isWindows ? 'win' : ''}`}>
      <Tree/>
      <div
        className={'fixed w-1 bg-transparent z-[200] left-0 top-0 h-screen -ml-0.5 cursor-col-resize select-none'}
        style={{left: treeStore.width}}
        onMouseDown={moveStart}
      />
      <div className={'flex-1 overflow-hidden flex flex-col pt-10 relative'}>
        <Nav/>
        <Tabs/>
        {treeStore.tabs.map((t) =>
          <div
            className={`flex-1 h-full overflow-y-auto items-start ${treeStore.currentTab === t ? '' : 'hidden'}`}
            key={t.id}
          >
            <EditorFrame tab={t}/>
          </div>
        )}
        <Characters/>
      </div>
      <About/>
      <Set/>
      <QuickOpen/>
      <History/>
      <ConfirmDialog/>
    </div>
  )
})
