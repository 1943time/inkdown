import {observer} from 'mobx-react-lite'
import {CloseOutlined, FileAddOutlined, FolderOpenOutlined, FolderOutlined, HistoryOutlined} from '@ant-design/icons'
import {MainApi} from '../api/main'
import logo from '../../../../resources/icon.png?asset'
import {useLayoutEffect} from 'react'
import {useLocalState} from '../hooks/useLocalState'
import {db, ISpace} from '../store/db'
import {basename, dirname} from 'path'
import {treeStore} from '../store/tree'
import {existsSync} from 'fs'
import {configStore} from '../store/config'
import {Icon} from '@iconify/react'
import {editSpace$} from './space/EditSpace'
import {keyTask$} from '../hooks/keyboard'

export const Empty = observer(() => {
  const [state, setState] = useLocalState({
    records: [] as {name: string, filePath: string, dir: string}[],
    spaces: [] as ISpace[]
  })
  useLayoutEffect(() => {
    db.space.toArray().then(res => {
      setState({
        spaces: res.sort((a, b) => a.lastOpenTime > b.lastOpenTime ? -1 : 1)
      })
    })
    const clearRecent = () => {
      setState({records: []})
    }
    window.electron.ipcRenderer.on('clear-recent', clearRecent)
    return () => {
      window.electron.ipcRenderer.removeListener('clear-recent', clearRecent)
    }
  }, [])
  return (
    <div className={'flex justify-center items-center h-[calc(100vh_-_40px)] overflow-y-auto py-10'}>
      <div className={'relative -top-12'}>
        <div className={'flex-col space-y-5 text-indigo-600 '}>
          <div className={'dark:text-gray-400 text-gray-600 flex items-center'}>
            <img src={logo} alt="" className={'w-5 h-5 mr-2 dark:shadow-none shadow shadow-gray-300 rounded'}/>
            Bluestone
          </div>
          <div className={'text-lg text-gray-500'}>
            {configStore.zh ? '没有打开的文件' : 'No open files'}
          </div>
          <div
            className={'hover:text-indigo-500 cursor-pointer duration-200 flex items-center'}
            onClick={() => {
              keyTask$.next({key: 'newNote'})
            }}
          >
            <Icon icon={'mingcute:file-new-line'} className={'text-lg'} />
            <span className={'ml-2'}>
              {configStore.zh ? '新建笔记' : 'New Note'}
            </span>
          </div>
          {!!treeStore.root &&
            <>
              <div
                className={'cursor-pointer hover:text-indigo-500 duration-200'}
                onClick={() => {
                  MainApi.sendToSelf('open-quickly')
                }}
              >
                <HistoryOutlined />
                <span className={'ml-2'}>
                  {configStore.zh ? '最近打开的笔记' : 'Recently opened notes'}
                </span>
              </div>
              {treeStore.tabs.length > 1 &&
                <div
                  className={'cursor-pointer hover:text-indigo-500 duration-200'}
                  onClick={() => {
                    treeStore.removeTab(treeStore.currentIndex)
                  }}
                >
                  <CloseOutlined />
                  <span className={'ml-2'}>
                  {configStore.zh ? '关闭' : 'Close'}
                </span>
                </div>
              }
            </>
          }
          {!treeStore.root &&
            <>
              <div
                className={'cursor-pointer hover:text-indigo-500 duration-200 flex items-center'}
                onClick={() => {
                  editSpace$.next(null)
                }}
              >
                <Icon icon={'material-symbols:workspaces-outline'} className={'text-lg'}/>
                <span
                  className={'ml-2'}>
                  {configStore.zh ? '创建工作空间' : 'Create a workspace'}
                </span>
              </div>
            </>
          }
        </div>
        {!treeStore.root && !!state.spaces.length &&
          <div className={'mt-6'}>
            <div className={'text-gray-500'}>
              {configStore.zh ? '最近打开的空间' : 'Recently opened spaces'}
            </div>
            <div className={'mt-2'}>
              {state.spaces.map(r =>
                <div className={'flex items-center py-1 dark:text-gray-300 text-gray-700 text-base'} key={r.cid}>
                  <span
                    className={'cursor-pointer hover:text-indigo-500 duration-200 flex items-center'}
                    onClick={() => {
                      treeStore.initial(r.cid)
                    }}
                  >
                    <Icon icon={'material-symbols:workspaces-outline'}/>
                    <span className={'ml-1'}>{r.name}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        }
      </div>
    </div>
  )
})
