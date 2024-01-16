import {observer} from 'mobx-react-lite'
import {MEditor} from './Editor'
import {Heading} from './tools/Leading'
import {Empty} from '../components/Empty'
import {Tab} from '../index'
import React, {useCallback, useEffect, useLayoutEffect, useMemo} from 'react'
import {EditorStoreContext} from './store'
import {FloatBar} from './tools/FloatBar'
import {TableAttr} from './tools/TableAttr'
import {Search} from './tools/Search'
import {MediaAttr} from './tools/MediaAttr'
import {mediaType} from './utils/dom'
import {treeStore} from '../store/tree'
import {MainApi} from '../api/main'
import {FolderOpenOutlined} from '@ant-design/icons'
import {getImageData} from '../utils'
import isHotkey from 'is-hotkey'
import {isMod} from '../utils/keyboard'
import {InsertNetworkImage} from './tools/InsertNetworkImage'
import {LangAutocomplete} from './tools/LangAutocomplete'
import {configStore} from '../store/config'

export const EditorFrame = observer(({tab}: {
  tab: Tab
}) => {
  const click = useCallback((e: React.MouseEvent) => {
    if (isMod(e) && e.target) {
      const el = (e.target as HTMLDivElement).parentElement
      if (!el) return
      if (el.dataset.fnc) {
        const target = document.querySelector(`[data-fnd-name="${el.dataset.fncName}"]`)
        target?.scrollIntoView({behavior: 'smooth'})
      }
      if (el.dataset.fnd) {
        const target = document.querySelector(`[data-fnc-name="${el.dataset.fndName}"]`)
        target?.scrollIntoView({behavior: 'smooth'})
      }
    }
  }, [])

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (isHotkey('esc', e) && tab.store.openSearch && treeStore.currentTab === tab) {
        tab.store.setOpenSearch(false)
      }
    }
    const open = () => {
      if (treeStore.currentTab === tab) {
        tab.store.setOpenSearch(true)
      }
    }
    window.addEventListener('keydown', keydown)
    window.electron.ipcRenderer.on('open-search', open)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.electron.ipcRenderer.removeListener('open-search', open)
    }
  }, [])

  useLayoutEffect(() => {
    tab.store.openFilePath = tab.current?.filePath || null
  }, [tab.current?.filePath])

  const mt = useMemo(() => mediaType(tab.current?.filePath || ''), [tab.current])
  const size = useMemo(() => {
    return {
      width: window.innerWidth - (treeStore.fold ? 0 : treeStore.width),
      height: window.innerHeight - 40
    }
  }, [treeStore.size, treeStore.fold, treeStore.width])
  const pt = useMemo(() => {
    let pt = 0
    if (tab.store.openSearch) pt += 46
    if (treeStore.tabs.length > 1) pt += 32
    return pt
  }, [tab.store.openSearch, treeStore.tabs.length])
  return (
    <EditorStoreContext.Provider value={tab.store}>
      <Search/>
      <div
        className={'flex-1 h-full overflow-y-auto items-start relative'}
        ref={dom => {
          tab.store.setState(state => state.container = dom)
        }}
      >
        {tab.current &&
          <>
            <div
              className={`items-start min-h-[calc(100vh_-_40px)] relative ${mt === 'markdown' ? '' : 'hidden'}`}
              onClick={click}
              style={{paddingTop: pt}}
            >
              <div className={`flex-1 flex justify-center items-start h-full`}>
                <div
                  style={{maxWidth: configStore.config.editorMaxWidth || 900}}
                  className={`flex-1 content px-14 ${configStore.config.editorLineHeight === 'compact' ? 'line-height-compact' : configStore.config.editorLineHeight === 'loose' ? 'line-height-loose' : ''}`}
                >
                  <MEditor note={tab.current}/>
                </div>
                {tab === treeStore.currentTab &&
                  <Heading note={tab.current}/>
                }
              </div>
            </div>
            {mt !== 'other' && mt !== 'markdown' &&
              <>
                {mt === 'image' ?
                  <div className={'text-center px-14 pb-5'} style={{paddingTop: pt + 20}}>
                    <img src={getImageData(tab.current?.filePath)} alt="" className={'inline'}/>
                  </div> :
                  (
                    <div
                      style={{
                        ...size,
                        paddingTop: pt + 20
                      }}
                      className={'px-10 pb-5'}
                    >
                      <iframe className={'w-full h-full rounded border b1'} src={tab.current.filePath}/>
                    </div>
                  )
                }
              </>
            }
            {mt === 'other' &&
              <div style={{height: size.height}} className={'flex items-center flex-col justify-center'}>
                <div className={'text-gray-600'}>{'Opening this file type is not currently supported'}</div>
                <div
                  className={'text-sky-500 text-sm mt-3 cursor-default duration-200 hover:text-sky-600'}
                  onClick={() => {
                    MainApi.openInFolder(tab.current?.filePath || '')
                  }}
                >
                  <FolderOpenOutlined/> {'Show in Finder'}
                </div>
              </div>
            }
          </>
        }
        {!tab.current &&
          <Empty/>
        }
        <FloatBar/>
        <TableAttr/>
        <MediaAttr/>
        <InsertNetworkImage/>
        <LangAutocomplete/>
      </div>
    </EditorStoreContext.Provider>
  )
})
