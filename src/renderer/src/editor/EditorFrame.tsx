import {observer} from 'mobx-react-lite'
import {MEditor} from './Editor'
import {Heading} from './tools/Leading'
import {Empty} from '../components/Empty'
import {Tab} from '../index'
import React, {useEffect, useMemo, useState} from 'react'
import {withMarkdown} from './plugins'
import {withReact} from 'slate-react'
import {withHistory} from 'slate-history'
import {createEditor} from 'slate'
import {EditorStore, EditorStoreContext} from './store'
import {FloatBar} from './tools/FloatBar'
import {TableAttr} from './tools/TableAttr'
import {Search} from './tools/Search'
import {MediaAttr} from './tools/MediaAttr'
import {mediaType} from './utils/dom'
import {treeStore} from '../store/tree'
import {MainApi} from '../api/main'
import {FolderOpenOutlined} from '@ant-design/icons'
import {getImageData} from '../utils'

export const EditorFrame = observer(({tab}: {
  tab: Tab
}) => {
  const [editor] = useState(() => withMarkdown(withReact(withHistory(createEditor()))))
  const store = useMemo(() => {
    const store = new EditorStore(editor)
    tab.store = store
    return store
  }, [])
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'f' && treeStore.currentTab.current) {
        store.setOpenSearch(true)
      }
      if (e.key.toLowerCase() === 'escape' && store.openSearch) {
        store.setOpenSearch(false)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('keydown', keydown)
    }
  }, [])
  const mt = useMemo(() => mediaType(tab.current?.filePath || ''), [tab.current])
  const size = useMemo(() => {
    return {
      width: window.innerWidth - (treeStore.fold ? 0 : treeStore.width),
      height: window.innerHeight - 40
    }
  }, [treeStore.size, treeStore.fold, treeStore.width])
  return (
    <EditorStoreContext.Provider value={store}>
      <Search/>
      <div
        className={'flex-1 h-full overflow-y-auto items-start'}
        ref={dom => {
          store.setState(state => state.container = dom)
        }}
      >
        <div className={`flex justify-center items-start min-h-[calc(100vh_-_40px)] relative ${store.openSearch ? 'pt-[46px]' : ''}`}>
          {tab.current ?
            <>
              {mt === 'markdown' &&
                <>
                  <div
                    className={'max-w-[900px] flex-1 content px-14'}
                  >
                    <MEditor note={tab.current}/>
                  </div>
                  <Heading note={tab.current}/>
                </>
              }
              {mt !== 'other' && mt !== 'markdown' &&
                <>
                {mt === 'image' ?
                  <div style={{height: size.height}} className={'flex items-center justify-center px-14 py-5'}>
                    <img src={getImageData(tab.current?.filePath)} alt=""/>
                  </div> :
                  (
                    <div style={{
                      ...size
                    }}>
                      <iframe className={'w-full h-full px-14 py-5'} src={tab.current.filePath}/>
                    </div>
                  )
                }
                </>
              }
              {mt === 'other' &&
                <div style={{height: size.height}} className={'flex items-center flex-col justify-center'}>
                  <div className={'text-gray-600'}>暂不支持打开该文件类型</div>
                  <div
                    className={'text-sky-500 text-sm mt-3 cursor-default duration-200 hover:text-sky-600'}
                    onClick={() => {
                      MainApi.openInFolder(tab.current?.filePath || '')
                    }}
                  >
                    <FolderOpenOutlined/> 在Finder中显示
                  </div>
                </div>
              }
            </> :
            <Empty/>
          }
          <FloatBar/>
          <TableAttr/>
          <MediaAttr/>
        </div>
      </div>
    </EditorStoreContext.Provider>
  )
})
