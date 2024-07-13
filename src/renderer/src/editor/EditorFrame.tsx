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
import {mediaType} from './utils/dom'
import {treeStore} from '../store/tree'
import {MainApi} from '../api/main'
import {FolderOpenOutlined} from '@ant-design/icons'
import {getImageData, isMod} from '../utils'
import {LangAutocomplete} from './tools/LangAutocomplete'
import {configStore} from '../store/config'
import {InsertAutocomplete} from './tools/InsertAutocomplete'
import { InsertLink } from './tools/InsertLink'
import { useLocalState } from '../hooks/useLocalState'
import { action } from 'mobx'
import {PhotoSlider} from 'react-photo-view'
export const EditorFrame = observer(({tab}: {
  tab: Tab
}) => {
  const [state, setState] = useLocalState({
    showLeftPadding: false
  })
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

  const mt = useMemo(() => mediaType(tab.current?.filePath || ''), [tab.current])
  useLayoutEffect(() => {
    tab.store.openFilePath = tab.current?.filePath || null
  }, [tab.current?.filePath])

  const size = useMemo(() => {
    return {
      width: window.innerWidth - (treeStore.fold ? 0 : treeStore.width),
      height: window.innerHeight - 40
    }
  }, [treeStore.size, treeStore.fold, treeStore.width])
  const pt = useMemo(() => {
    let pt = 0
    if (tab.store.openSearch) pt += 46
    return pt
  }, [tab.store.openSearch, treeStore.tabs.length])
  useEffect(() => {
    const show = treeStore.fold && configStore.config.showLeading
    if (show) {
      setTimeout(() => {
        setState({
          showLeftPadding: true
        })
      }, 300)
    } else {
      setState({
        showLeftPadding: false
      })
    }
  }, [treeStore.fold])
  return (
    <EditorStoreContext.Provider value={tab.store}>
      <Search />
      <div
        className={'flex-1 h-full overflow-y-auto items-start relative'}
        ref={(dom) => {
          tab.store.setState((state) => (state.container = dom))
        }}
      >
        {tab.current && (
          <>
            <div
              className={`items-start min-h-[calc(100vh_-_40px)] relative ${
                mt === 'markdown' ? '' : 'hidden'
              }`}
              onClick={click}
              style={{ paddingTop: pt }}
            >
              <div className={`flex-1 flex justify-center items-start h-full pr-8`}>
                <div
                  className={`duration-200 ${
                    state.showLeftPadding ? 'w-40' : 'w-0'
                  } xl:block hidden`}
                />
                <div
                  style={{ maxWidth: configStore.config.editorWidth + 96 || 796 }}
                  className={`flex-1 content px-12 ${
                    configStore.config.editorLineHeight === 'compact'
                      ? 'line-height-compact'
                      : configStore.config.editorLineHeight === 'loose'
                      ? 'line-height-loose'
                      : ''
                  }`}
                >
                  <MEditor note={tab.current} />
                </div>
                {tab === treeStore.currentTab && <Heading note={tab.current} />}
              </div>
            </div>
            {mt !== 'other' && mt !== 'markdown' && (
              <>
                {mt === 'image' ? (
                  <div
                    className={
                      'h-full overflow-y-auto flex items-center flex-wrap justify-center py-5 px-10'
                    }
                    style={{ paddingTop: pt + 20 }}
                  >
                    <img src={getImageData(tab.current?.filePath)} alt="" className={'block'} />
                  </div>
                ) : (
                  <div
                    style={{
                      ...size,
                      paddingTop: pt + 20
                    }}
                    className={'px-10 pb-5'}
                  >
                    <iframe
                      className={'w-full h-full overflow-y-auto rounded border b1'}
                      src={tab.current.filePath}
                    />
                  </div>
                )}
              </>
            )}
            {mt === 'other' && (
              <div
                style={{ height: size.height }}
                className={'flex items-center flex-col justify-center'}
              >
                <div className={'text-gray-600'}>
                  {'Opening this file type is not currently supported'}
                </div>
                <div
                  className={
                    'dark:text-white/70 hover:dark:text-white/90 text-sm mt-3 cursor-pointer duration-200 text-black/70 hover:text-black/90'
                  }
                  onClick={() => {
                    MainApi.showInFolder(tab.current?.filePath || '')
                  }}
                >
                  <FolderOpenOutlined /> {'Show in Finder'}
                </div>
              </div>
            )}
          </>
        )}
        {!tab.current && <Empty />}
        <FloatBar />
        <InsertLink />
        <TableAttr />
        <LangAutocomplete />
        <InsertAutocomplete />
        <PhotoSlider
          maskOpacity={0.5}
          className={'desktop-img-view'}
          images={tab.store.viewImages.map((src) => ({ src, key: src }))}
          visible={tab.store.openViewImage}
          onClose={action(() => (tab.store.openViewImage = false))}
          index={tab.store.viewImageIndex}
          onIndexChange={action((i) => (tab.store.viewImageIndex = i))}
        />
      </div>
    </EditorStoreContext.Provider>
  )
})
