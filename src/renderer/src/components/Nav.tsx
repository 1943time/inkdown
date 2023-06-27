import {observer} from 'mobx-react-lite'
import {AppstoreOutlined, LeftOutlined, RightOutlined, SendOutlined} from '@ant-design/icons'
import {treeStore} from '../store/tree'
import {Fragment, useMemo} from 'react'
import {MainApi} from '../api/main'
import {ShareSet} from '../share/ShareSet'

export const Nav = observer(() => {
  const paths = useMemo(() => {
    if (!treeStore.openNote) return ['']
    return treeStore.getAbsolutePath(treeStore.openNote)
  }, [treeStore.openNote])
  return (
    <div
      className={'fixed left-0 top-0 h-[40px] w-full b1 border-b nav z-50 duration-200 drag-nav select-none'}
      style={{paddingLeft: treeStore.fold ? 114 : treeStore.width}}
      onClick={e => {
        if (e.detail === 2) {
          MainApi.maxSize()
        }
      }}
    >
      <div
        className={'justify-between flex items-center h-full flex-1'}
      >
        <div className={'flex items-center h-full flex-1'}>
          <div className={`text-gray-300 flex items-center text-sm select-none ${treeStore.fold ? '' : 'ml-3'}`}>
            <div
              className={`duration-200 py-[3px] px-1 rounded ${treeStore.currentTab.hasPrev ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500' : 'dark:text-gray-500 text-gray-300'}`}
              onClick={() => treeStore.navigatePrev()}
            >
              <LeftOutlined/>
            </div>
            <div
              className={`duration-200 py-[3px] px-1 rounded ${treeStore.currentTab.hasNext ? 'dark:text-gray-200 hover:bg-gray-400/10 text-gray-500' : 'dark:text-gray-500 text-gray-300'}`}
              onClick={() => treeStore.navigateNext()}
            >
              <RightOutlined />
            </div>
          </div>
          <div
            className={'hide-scrollbar overflow-x-auto ml-3 dark:text-gray-400/80 text-gray-500 text-sm flex items-center h-full w-[calc(100%_130px)]'}
            onClick={() => {
              window.api.test()
            }}
          >
            {!!paths.length &&
              <>
                {paths.map((c, i) =>
                  <Fragment key={i}>
                    {i !== 0 &&
                      <span className={'mx-2'}>/</span>
                    }
                    <span
                      className={`${i === paths.length - 1 ? 'dark:text-gray-300 text-gray-600' : ''} inline-block truncate max-w-[260px]`}
                    >
                      {i === paths.length - 1 ? c.replace(/\.\w+/, '') : c}
                    </span>
                    {i === paths.length - 1 && !['md', 'markdown'].includes(treeStore.openNote?.ext!) &&
                      <sup className={'text-sky-500 ml-0.5 text-[80%]'}>{treeStore.openNote?.ext}</sup>
                    }
                  </Fragment>
                )}
              </>
            }
          </div>
        </div>
        <div className={'flex items-center pr-3 dark:text-gray-400/70 space-x-4 text-gray-500'}>
          <ShareSet/>
          <AppstoreOutlined
            className={'text-lg duration-200 dark:hover:text-gray-300 hover:text-gray-600'}
            onClick={() => MainApi.openToolMenu(treeStore.openNote?.filePath)}
          />
        </div>
      </div>
      {/*{treeStore.tabs.length > 1 &&*/}
      {/*  <div*/}
      {/*    className={`h-8 border-gray-200/10 border-b text-[13px] overflow-x-auto hide-scrollbar relative w-full`}*/}
      {/*  >*/}
      {/*    <div className={'flex h-full'}>*/}
      {/*      {treeStore.tabs.map((t, i) =>*/}
      {/*        <div*/}
      {/*          onClick={() => {*/}
      {/*            treeStore.setState({currentIndex: i})*/}
      {/*          }}*/}
      {/*          className={`${i === treeStore.currentIndex ? 'bg-[#24262A]' : 'bg-[#1F2024]'}*/}
      {/*        ${i !== 0 ? 'border-l border-gray-200/10' : ''}*/}
      {/*        relative flex-1 min-w-[200px] text-gray-300 h-full flex items-center group px-8 cursor-default`}*/}
      {/*          key={i}*/}
      {/*        >*/}
      {/*          <div*/}
      {/*            className={`${i === treeStore.currentIndex ? '' : 'hidden group-hover:block'}*/}
      {/*          absolute p-1 left-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300`}*/}
      {/*            onClick={(e) => {*/}
      {/*              e.stopPropagation()*/}
      {/*              treeStore.removeTab(i)*/}
      {/*            }}*/}
      {/*          >*/}
      {/*            <IClose*/}
      {/*              className={'w-4 h-4'}*/}
      {/*            />*/}
      {/*          </div>*/}
      {/*          <div className={'w-full truncate text-center'}>*/}
      {/*            {t.current? t.current.filename : 'New Tab'}*/}
      {/*          </div>*/}
      {/*        </div>*/}
      {/*      )}*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*}*/}
    </div>
  )
})
