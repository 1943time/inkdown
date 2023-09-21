import {observer} from 'mobx-react-lite'
import {FileAddOutlined, FolderOpenOutlined, FolderOutlined} from '@ant-design/icons'
import {MainApi} from '../api/main'
import {configStore} from '../store/config'
import logo from '../../../../resources/icon.png?asset'
import {useEffect} from 'react'
import {useLocalState} from '../hooks/useLocalState'
import {db} from '../store/db'
import {basename, dirname} from 'path'
import {treeStore} from '../store/tree'
import {existsSync} from 'fs'

export const Empty = observer(() => {
  const [state, setState] = useLocalState({
    records: [] as {name: string, filePath: string, dir: string}[]
  })
  useEffect(() => {
    MainApi.getPath('home').then(home => {
      db.recent.limit(5).toArray().then(res => {
        setState({records: res.sort((a, b) => a.time > b.time ? -1 : 1).
          filter(r => {
          try {
            return existsSync(r.filePath)
          } catch (e) {
            db.recent.where('id').equals(r.id!).delete()
            return false
          }
          }).sort((a, b) => a.time > b.time ? -1 : 1).map(r => {
            return {
              name: basename(r.filePath),
              filePath: r.filePath,
              dir: r.filePath.startsWith(home)  ? '~' + dirname(r.filePath).replace(home, '') : dirname(r.filePath)
            }
          })})
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
    <div className={'flex justify-center items-center h-[calc(100vh_-_40px)] overflow-y-auto'}>
      <div className={'relative -top-12'}>
        <div className={'flex-col space-y-5 text-sky-600 '}>
          <div className={'text-lg dark:text-gray-400 text-gray-600 flex items-center'}>
            <img src={logo} alt="" className={'w-5 h-5 mr-2'}/>
            Bluestone
          </div>
          <div className={'text-lg text-gray-500'}>
            {'No open files'}
          </div>
          <div
            className={'cursor-default hover:text-sky-400 duration-200'}
            onClick={() => {
              MainApi.sendToSelf('create')
            }}
          >
            <FileAddOutlined/>
            <span className={'ml-2'}>
              {'Create a Markdown file'}
            </span>
          </div>
          <div
            className={'cursor-default hover:text-sky-400 duration-200'}
            onClick={() => {
              MainApi.sendToSelf('open')
            }}
          >
            <FolderOpenOutlined/>
            <span
              className={'ml-2'}>
            {'Open file or folder'}
          </span>
          </div>
        </div>
        {!!state.records.length &&
          <div className={'mt-6'}>
            <div className={'text-lg text-gray-500'}>
              {'Recent'}
            </div>
            <div className={'mt-2'}>
              {state.records.map(r =>
                <div className={'flex items-center py-1 text-gray-400 text-sm'} key={r.filePath}>
                <span
                  className={'cursor-default text-sky-600 duration-200 hover:text-sky-400'}
                  onClick={() => {
                    treeStore.open(r.filePath)
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
