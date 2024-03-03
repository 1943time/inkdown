import {observer} from 'mobx-react-lite'
import {LeftOutlined, RightOutlined} from '@ant-design/icons'
import {Fragment, useCallback, useEffect} from 'react'
import {action} from 'mobx'
import {treeStore} from '../../store/tree'
import {isMac, message$} from '../../utils'
import {IMenu, openMenus} from '../Menu'
import {History} from './History'
import Collapse from '../../icons/Collapse'
import {Icon} from '@iconify/react'
import {MainApi} from '../../api/main'
import {useLocalState} from '../../hooks/useLocalState'
import {sep} from 'path'
import {Share} from '../../server/Share'
import {configStore} from '../../store/config'
import {toMarkdown} from '../../editor/utils/toMarkdown'
import {convertRemoteImages} from '../../editor/utils/media'
import {clearUnusedImages} from '../../editor/utils/clearUnusedImages'

export const Nav = observer(() => {
  const [state, setState] = useLocalState({
    path: [] as string[],
    openImport: false,
    exportFolder: false,
    openHistory: false,
    importMarkdown: false,
    drag: false
  })
  const getPath = useCallback(() => {
    if (treeStore.openedNote) {
      if (treeStore.openedNote.spaceId) {
        setState({
          path: treeStore.openedNote.filePath.replace(treeStore.root?.filePath! + '/', '').split(sep)
        })
      } else {
        setState({
          path: treeStore.openedNote.filePath.replace(configStore.homePath, '~').split(sep)
        })
      }
    } else {
      setState({path: []})
    }
  }, [])

  useEffect(() => {
    getPath()
  }, [treeStore.openedNote, treeStore.openedNote?.filePath])

  const checkOpenedNote = useCallback(() => {
    if (!treeStore.openedNote) {
      message$.next({
        type: 'warning',
        content: 'Please open at least one doc'
      })
      return false
    }
    return true
  }, [])
  return (
    <div
      className={`fixed left-0 top-0 h-10 w-full z-[100] duration-200 drag-nav select-none width-duration`}
      style={{paddingLeft: treeStore.fold ? isMac ? 112 : 42 : treeStore.width}}
      onClick={e => {
        if (e.detail === 2) {
          MainApi.maxSize()
        }
      }}
    >
      <div
        className={`justify-between relative flex nav items-center h-full flex-1`}
      >
        <div
          className={'absolute top-1/2 -translate-y-1/2 dark:hover:bg-gray-400/10 hover:bg-black/5 p-1 rounded drag-none'}
          style={{
            left: treeStore.fold ? -30 : -40
          }}
          onClick={action(() => {
            treeStore.fold = !treeStore.fold
          })}
        >
          <Collapse
            className={'dark:stroke-gray-400 stroke-gray-500 w-[18px] h-[18px] cursor-pointer'}
          />
        </div>
        <div className={'flex items-center h-full flex-1'}>
          <div className={`text-gray-300 flex items-center text-sm select-none ${treeStore.fold ? '' : 'ml-3'}`}>
            <div
              className={`duration-200 cursor-pointer drag-none py-[3px] px-1 rounded ${treeStore.currentTab?.hasPrev ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500' : 'dark:text-gray-500 text-gray-300'}`}
              onClick={() => treeStore.navigatePrev()}
            >
              <LeftOutlined />
            </div>
            <div
              className={`duration-200 cursor-pointer drag-none py-[3px] px-1 rounded ${treeStore.currentTab?.hasNext ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500' : 'dark:text-gray-500 text-gray-300'}`}
              onClick={() => treeStore.navigateNext()}
            >
              <RightOutlined />
            </div>
          </div>
          <div
            className={'hide-scrollbar overflow-x-auto ml-3 dark:text-gray-400/80 text-gray-500 text-sm flex items-center h-full w-[calc(100%_130px)]'}
          >
            {!!state.path.length &&
              <>
                {state.path.map((c, i) =>
                  <Fragment key={i}>
                    {i !== 0 &&
                      <span className={'mx-2'}>/</span>
                    }
                    <span
                      className={`${i === state.path.length - 1 ? 'dark:text-gray-300 text-gray-600' : ''} inline-block truncate max-w-[260px]`}
                    >
                      {i === state.path.length - 1 ? c.replace(/\.\w+/, '') : c}
                    </span>
                    {i === state.path.length - 1 && treeStore.currentTab?.store?.docChanged &&
                      <sup className={'ml-0.5'}>*</sup>
                    }
                  </Fragment>
                )}
              </>
            }
          </div>
        </div>
        <div className={'flex items-center pr-3 dark:text-gray-300/90 space-x-1.5 text-gray-500'}>
          <Share />
          <div
            className={'flex items-center justify-center h-[26px] w-[26px] rounded dark:hover:bg-gray-200/10 hover:bg-gray-200/60 cursor-pointer duration-200 drag-none'}
            onClick={e => {
              const menus: IMenu[] = [
                {
                  text: 'Export To PDF',
                  disabled: treeStore.openedNote?.ext !== 'md',
                  click: () => {
                    window.electron.ipcRenderer.send('print-pdf', treeStore.openedNote?.filePath)
                  }
                },
                {
                  text: 'Copy markdown source code',
                  disabled: treeStore.openedNote?.ext !== 'md',
                  click: async () => {
                    if (checkOpenedNote()) {
                      const md = toMarkdown(treeStore.openedNote?.schema || [])
                      window.api.copyToClipboard(md)
                      message$.next({
                        type: 'success',
                        content: configStore.zh ? '已复制到剪贴板' : 'Copied to clipboard'
                      })
                    }
                  }
                },
                {hr: true},
                {
                  text: 'File History',
                  click: () => setState({ openHistory: true }),
                  disabled: treeStore.openedNote?.ext !== 'md'
                },
                {
                  text: configStore.zh ? '下载远程图片至本机' : 'Download remote images to local',
                  disabled: treeStore.openedNote?.ext !== 'md',
                  click: () => {
                    convertRemoteImages(treeStore.openedNote!)
                  }
                },
                {
                  text: configStore.zh ? '清除未使用的图片' : 'Clear Unused Images',
                  disabled: !treeStore.root,
                  click: () => {
                    clearUnusedImages()
                  }
                },
                { hr: true },
                {
                  text: isMac ? 'Reveal in Finder' : 'Reveal in File Explorer',
                  disabled: !treeStore.openedNote,
                  click: () => {
                    MainApi.openInFolder(treeStore.openedNote!.filePath)
                  }
                },
                {
                  text: configStore.zh ? '使用默认APP打开' : 'Open in default app',
                  click: () => window.electron.ipcRenderer.send('open-in-default-app', treeStore.openedNote?.filePath),
                  disabled: !treeStore.openedNote
                },
                { hr: true },
                {
                  text: 'Preferences',
                  key: 'cmd+,',
                  click: action(() => configStore.visible = true)
                }
              ]
              openMenus(e, menus)
            }}
          >
            <Icon
              icon={'uiw:more'}
              className={'text-lg'}
            />
          </div>
        </div>
      </div>
      <History
        node={treeStore.openedNote}
        open={state.openHistory}
        onClose={() => setState({ openHistory: false })}
      />
    </div>
  )
})
