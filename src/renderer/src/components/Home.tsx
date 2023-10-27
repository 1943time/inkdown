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
import IClose from '../icons/IClose'
import {useSystemMenus} from '../hooks/menu'

export const Home = observer(() => {
  useSystemMenus()
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
    window.electron.ipcRenderer.send('open-file', treeStore.openedNote && treeStore.openedNote.ext === 'md')
  }, [treeStore.openedNote])

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
        {treeStore.tabs.length > 1 &&
          <div
            id={'nav-tabs'}
            className={`h-8 bg-gray-50 dark:bg-zinc-900 border-gray-200/80 dark:border-gray-200/10 border-b text-[13px] overflow-x-auto hide-scrollbar w-full absolute top-10 z-50`}
          >
            <div className={'flex h-full'}>
              {treeStore.tabs.map((t, i) =>
                <div
                  onContextMenu={action(() => {
                    treeStore.tabContextIndex = i
                    window.electron.ipcRenderer.send('tab-context-menu')
                  })}
                  title={t.current?.filePath}
                  onClick={() => {
                    treeStore.selectTab(i)
                  }}
                  className={`${i === treeStore.currentIndex ? 'dark:bg-zinc-300/5 bg-white text-gray-600 dark:text-gray-200' : 'dark:text-gray-300 text-gray-500  hover:text-gray-600 dark:hover:text-gray-200'}
              ${i !== 0 ? 'border-l dark:border-gray-200/10 border-gray-200' : ''}
              relative flex-1 min-w-[200px] h-full flex items-center group px-8 cursor-default`}
                  key={i}
                >
                  <div
                    className={`opacity-0 group-hover:opacity-100 duration-200 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-200/10
                absolute left-1 p-[1px] top-1/2 -translate-y-1/2 dark:text-gray-500 dark:hover:text-gray-300`}
                    onClick={(e) => {
                      e.stopPropagation()
                      treeStore.removeTab(i)
                    }}
                  >
                    <IClose
                      className={'w-[14px] h-[14px]'}
                    />
                  </div>
                  <div className={'w-full truncate text-center select-none'}>
                    {t.current? t.current.filename : 'New Tab'}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
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
    </div>
  )
})
