import {observer} from 'mobx-react-lite'
import {treeStore} from '../../../store/tree'
import Folder from '../../../assets/ReactIcon/Folder'
import ISearch from '../../../assets/ReactIcon/ISearch'
import Collapse from '../../../assets/ReactIcon/Collapse'
import {Tooltip} from 'antd'
import {useEffect, useState} from 'react'

export const TreeTop = observer(() => {
  const [full, setFull] = useState(false)
  useEffect(() => {
    window.electron.ipcRenderer.on('enter-full-screen', () => {
      setFull(true)
    })
    window.electron.ipcRenderer.on('leave-full-screen', () => {
      setFull(false)
    })
  }, [])
  return (
    <div
      className={`fixed left-0 top-0 z-20 h-[40px] ${full ? 'pl-5' : 'pl-20'} duration-200`}
      style={{width: treeStore.fold ? 114 : treeStore.width}}
    >
      <div className={'flex h-full items-center'}>
        <div className={`h-full space-x-3 items-center flex duration-200 ${treeStore.fold ? 'opacity-0 -translate-x-10' : ''}`}>
          <Tooltip placement={'bottom'} title={'文件树'} mouseEnterDelay={1} arrow={false}>
            <div
              className={`p-1 rounded  ${treeStore.treeTab === 'folder' ? 'dark:bg-black/30 bg-black/10 dark:fill-gray-300 fill-gray-600' : 'dark:fill-gray-400 fill-gray-500 dark:hover:bg-black/20 hover:bg-black/5'}`}
              onClick={() => {
                treeStore.setState({treeTab: 'folder'})
              }}
            >
              <Folder className={'w-[18px] h-[18px]'}/>
            </div>
          </Tooltip>
          <Tooltip placement={'bottom'} title={'搜索'} mouseEnterDelay={1} arrow={false}>
            <div
              className={`p-1 rounded  ${treeStore.treeTab === 'search' ? 'dark:bg-black/30 bg-black/10 dark:fill-gray-300 fill-gray-600' : 'dark:fill-gray-400 fill-gray-500 dark:hover:bg-black/20 hover:bg-black/5'}`}
              onClick={() => {
                treeStore.setState({treeTab: 'search'})
              }}
            >
              <ISearch className={'w-[18px] h-[18px]'}/>
            </div>
          </Tooltip>
        </div>
        <Tooltip placement={'bottom'} title={'切换显示侧栏'} mouseEnterDelay={1} arrow={false}>
          <div
            className={'absolute right-2 top-1/2 -translate-y-1/2 dark:hover:bg-black/20 hover:bg-black/5 p-1 rounded'}
            onClick={() => {
              treeStore.setState({
                fold: !treeStore.fold
              })
            }}
          >
            <Collapse
              className={'dark:stroke-gray-400 stroke-gray-500 w-[18px] h-[18px]'}
            />
          </div>
        </Tooltip>
      </div>
    </div>
  )
})
