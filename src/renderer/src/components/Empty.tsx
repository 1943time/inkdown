import {observer} from 'mobx-react-lite'
import {CloseOutlined, FileAddOutlined, FolderOpenOutlined, FolderOutlined, HistoryOutlined} from '@ant-design/icons'
import {MainApi} from '../api/main'
import logo from '../../../../resources/icon.png?asset'
import {useLayoutEffect} from 'react'
import {useLocalState} from '../hooks/useLocalState'
import {db, ISpace} from '../store/db'
import {basename, dirname} from 'path'
import {treeStore} from '../store/tree'
import {existsSync, readFileSync, statSync} from 'fs'
import {configStore} from '../store/config'
import {Icon} from '@iconify/react'
import {editSpace$} from './space/EditSpace'
import {keyTask$} from '../hooks/keyboard'
import {parserMdToSchema} from '../editor/parser/parser'
import {createFileNode, insertFileNode} from '../store/parserNode'
import {nid} from '../utils'

export const Empty = observer(() => {
  const [state, setState] = useLocalState({
    records: [] as {name: string, filePath: string, dir: string}[],
    spaces: [] as ISpace[]
  })
  useLayoutEffect(() => {
    db.space.toArray().then(res => {
      setState({
        spaces: res.sort((a, b) => a.lastOpenTime > b.lastOpenTime ? -1 : 1).slice(0, 5)
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
        <div className={'flex-col space-y-5 text-indigo-500 '}>
          <div className={'dark:text-gray-400 text-gray-600 flex items-center'}>
            <img src={logo} alt="" className={'w-5 h-5 mr-2 dark:shadow-none shadow shadow-gray-300 rounded'}/>
            Bluestone
          </div>
          <div className={'text-base text-gray-500'}>
            {configStore.zh ? '没有打开的文件' : 'No open files'}
          </div>
          <div
            className={'hover:text-indigo-600 cursor-pointer duration-200 flex items-center'}
            onClick={() => {
              keyTask$.next({key: 'newNote'})
            }}
          >
            <Icon icon={'mingcute:file-new-line'} className={'text-lg'}/>
            <span className={'ml-2'}>
              {configStore.zh ? '新建文档' : 'New Doc'}
            </span>
          </div>
          {!treeStore.root &&
            <div
              className={'hover:text-indigo-600 cursor-pointer duration-200 flex items-center'}
              onClick={() => {
                MainApi.openDialog({
                  filters: [{name: 'md', extensions: ['md']}],
                  properties: ['openFile']
                }).then(async res => {
                  if (res.filePaths.length) {
                    const path = res.filePaths[0]
                    const file = await db.file.where('filePath').equals(path).first()
                    const stat = statSync(path)
                    if (file && !file.spaceId) {
                      if (stat.mtime.valueOf() === file.updated) {
                        treeStore.openNote(createFileNode(file))
                      } else {
                        const [res] = await parserMdToSchema([{filePath: path}])
                        db.file.update(file.cid, {
                          schema: res.schema,
                          updated: stat.mtime.valueOf()
                        })
                        file.schema = res.schema
                        file.updated = stat.mtime.valueOf()
                        treeStore.openNote(createFileNode(file))
                      }
                    } else {
                      const [res] = await parserMdToSchema([{filePath: path}])
                      const now = Date.now()
                      const id = nid()
                      await db.file.add({
                        cid: id,
                        created: now,
                        updated: stat.mtime.valueOf(),
                        folder: false,
                        schema: res.schema,
                        sort: 0,
                        filePath: path
                      })
                      const file = await db.file.get(id)
                      if (file) treeStore.openNote(createFileNode(file))
                    }
                  }
                })
              }}
            >
              <Icon icon={'tabler:file-text'} className={'text-lg'}/>
              <span className={'ml-2'}>
              {configStore.zh ? '打开文档' : 'Open Doc'}
            </span>
            </div>
          }
          {!!treeStore.root &&
            <>
              <div
                className={'cursor-pointer hover:text-indigo-600 duration-200'}
                onClick={() => {
                  keyTask$.next({key: 'quickOpen'})
                }}
              >
                <HistoryOutlined/>
                <span className={'ml-2'}>
                  {configStore.zh ? '最近打开的文档' : 'Recently opened docs'}
                </span>
              </div>
              {treeStore.tabs.length > 1 &&
                <div
                  className={'cursor-pointer hover:text-indigo-500 duration-200'}
                  onClick={() => {
                    treeStore.removeTab(treeStore.currentIndex)
                  }}
                >
                  <CloseOutlined/>
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
                className={'cursor-pointer hover:text-indigo-600 duration-200 flex items-center'}
                onClick={() => {
                  editSpace$.next(null)
                }}
              >
                <Icon icon={'material-symbols:workspaces-outline'} className={'text-lg'}/>
                <span
                  className={'ml-2'}>
                  {configStore.zh ? '创建文档空间' : 'Create doc space'}
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
                <div
                  className={'flex items-center py-1 dark:text-gray-300 text-gray-700 text-base'} key={r.cid}
                  onClick={() => {
                    treeStore.initial(r.cid)
                  }}
                >
                  <span
                    className={'cursor-pointer hover:text-indigo-500 duration-200 flex items-center'}
                  >
                    <Icon icon={'material-symbols:workspaces-outline'}/>
                    <span className={'ml-2'}>{r.name}</span>
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
