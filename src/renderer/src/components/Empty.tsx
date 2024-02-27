import {observer} from 'mobx-react-lite'
import {CloseOutlined, FileAddOutlined, FolderOpenOutlined, FolderOutlined, HistoryOutlined} from '@ant-design/icons'
import {MainApi} from '../api/main'
import logo from '../../../../resources/icon.png?asset'
import {useLayoutEffect} from 'react'
import {useLocalState} from '../hooks/useLocalState'
import {db} from '../store/db'
import {basename, dirname} from 'path'
import {treeStore} from '../store/tree'
import {existsSync} from 'fs'
import {configStore} from '../store/config'
import {Icon} from '@iconify/react'

export const Empty = observer(() => {
  const [state, setState] = useLocalState({
    records: [] as {name: string, filePath: string, dir: string}[]
  })
  useLayoutEffect(() => {
    // MainApi.getPath('home').then(home => {
    //   db.recent.limit(5).toArray().then(res => {
    //     setState({records: res.sort((a, b) => a.time > b.time ? -1 : 1).
    //       filter(r => {
    //       try {
    //         return existsSync(r.filePath)
    //       } catch (e) {
    //         db.recent.where('id').equals(r.id!).delete()
    //         return false
    //       }
    //       }).sort((a, b) => a.time > b.time ? -1 : 1).map(r => {
    //         return {
    //           name: basename(r.filePath),
    //           filePath: r.filePath,
    //           dir: r.filePath.startsWith(home)  ? '~' + dirname(r.filePath).replace(home, '') : dirname(r.filePath)
    //         }
    //       })})
    //   })
    // })
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
        <div className={'flex-col space-y-5 text-sky-600 '}>
          <div className={'text-lg dark:text-gray-400 text-gray-600 flex items-center'}>
            <img src={logo} alt="" className={'w-5 h-5 mr-2'}/>
            Bluestone
          </div>
          <div className={'text-lg text-gray-500'}>
            {configStore.zh ? '没有打开的文件' : 'No open files'}
          </div>
          <div
            className={'cursor-default hover:text-sky-400 duration-200 flex items-center'}
            onClick={() => {
              MainApi.sendToSelf('create')
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
                className={'cursor-default hover:text-sky-400 duration-200'}
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
                  className={'cursor-default hover:text-sky-400 duration-200'}
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
                className={'cursor-default hover:text-sky-400 duration-200 flex items-center'}
                onClick={() => {
                  MainApi.sendToSelf('open')
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
        {!!state.records.length && !treeStore.root &&
          <div className={'mt-6'}>
            <div className={'text-lg text-gray-500'}>
              {configStore.zh ? '最近打开' : 'Recent'}
            </div>
            <div className={'mt-2'}>
              {state.records.map(r =>
                <div className={'flex items-center py-1 text-gray-400 text-sm'} key={r.filePath}>
                <span
                  className={'cursor-default text-sky-600 duration-200 hover:text-sky-400'}
                  onClick={() => {
                    try {
                      treeStore.openFolder(r.filePath)
                      treeStore.openFirst()
                    } catch (e) {
                      MainApi.open(r.filePath).then(res => {
                        if (res.filePaths.length) {
                          treeStore.openFolder(res.filePaths[0])
                          treeStore.openFirst()
                        }
                      })
                    }
                  }}
                >
                  <FolderOutlined />
                  <span className={'ml-1'}>{r.name}</span>
                </span>
                  <span className={'ml-6'}>{r.dir}</span>
                </div>
              )}
            </div>
          </div>
        }
      </div>
    </div>
  )
})
