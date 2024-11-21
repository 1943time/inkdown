import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'
import Folder from '../../icons/Folder'
import ISearch from '../../icons/ISearch'
import Collapse from '../../icons/Collapse'
import { useSetState } from 'react-use'
import { isMac } from '../../utils'
import IconTag from '../../icons/IconTag'
import { useCoreContext } from '../../store/core'

export const TreeTop = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useSetState({
    full: false
  })
  useEffect(() => {
    window.electron.ipcRenderer.on('enter-full-screen', () => {
      setState({full: true})
    })
    window.electron.ipcRenderer.on('leave-full-screen', () => {
      setState({full: false})
    })
  }, [])
  return (
    <div
      className={`fixed left-0 top-0 z-20 h-[40px] ${!isMac ? 'pl-2' : state.full ? 'pl-5' : 'pl-20'} duration-200 width-duration`}
      style={{width: core.tree.fold ? !isMac ? 42 : 114 : core.tree.width}}
    >
      <div className={'flex h-full items-center'}>
        <div
          className={`h-full space-x-3 items-center flex duration-200 ${core.tree.fold ? 'opacity-0 -translate-x-10' : ''}`}>
          <div
            className={`p-1 rounded  ${core.tree.treeTab === 'folder' ? 'dark:bg-gray-300/10 bg-black/10 dark:fill-gray-300 fill-gray-600' : 'dark:fill-gray-400 fill-gray-500 dark:hover:bg-gray-400/10 hover:bg-black/5'}`}
            onClick={() => {
              core.tree.setState({treeTab: 'folder'})
            }}
          >
            <Folder className={'w-[18px] h-[18px]'}/>
          </div>
          <div
            className={`p-1 rounded  ${core.tree.treeTab === 'search' ? 'dark:bg-gray-300/10 bg-black/10 dark:fill-gray-300 fill-gray-600' : 'dark:fill-gray-400 fill-gray-500 dark:hover:bg-gray-400/10 hover:bg-black/5'}`}
            onClick={() => {
              core.tree.setState({treeTab: 'search'})
            }}
          >
            <ISearch className={'w-[18px] h-[18px]'}/>
          </div>
          <div
            className={`p-1 rounded  ${core.tree.treeTab === 'bookmark' ? 'dark:bg-gray-300/10 bg-black/10 dark:fill-gray-300 fill-gray-600' : 'dark:fill-gray-400 fill-gray-500 dark:hover:bg-gray-400/10 hover:bg-black/5'}`}
            onClick={() => {
              core.tree.setState({treeTab: 'bookmark'})
            }}
          >
            <IconTag className={'w-[18px] h-[18px]'} />
          </div>
        </div>
        <div
          className={'absolute right-2 top-1/2 -translate-y-1/2 dark:hover:bg-gray-400/10 hover:bg-black/5 p-1 rounded'}
          onClick={() => {
            core.tree.setState({
              fold: !core.tree.fold
            })
          }}
        >
          <Collapse
            className={'dark:stroke-gray-400 stroke-gray-500 w-[18px] h-[18px]'}
          />
        </div>
      </div>
    </div>
  )
})
