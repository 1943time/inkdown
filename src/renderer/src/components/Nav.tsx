import {observer} from 'mobx-react-lite'
import {AppstoreOutlined, LeftOutlined, RightOutlined, SendOutlined} from '@ant-design/icons'
import {treeStore} from '../store/tree'
import {Fragment, useMemo} from 'react'
import {MainApi} from '../api/main'
import {Update} from './Update'
import {Share} from '../share/Share'
import {User} from '../share/User'
import {isWindows} from '../utils'
export const Nav = observer(() => {
  const paths = useMemo(() => {
    if (!treeStore.openNote) return ['']
    return treeStore.getAbsolutePath(treeStore.openNote)
  }, [treeStore.openNote])
  return (
    <div
      className={'fixed left-0 top-0 h-[40px] w-full b1 border-b nav z-50 duration-200 drag-nav select-none width-duration'}
      style={{paddingLeft: treeStore.fold ? isWindows ? 42 : 114 : treeStore.width}}
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
                    {i === paths.length - 1 && ['md', 'markdown'].includes(treeStore.openNote?.ext!) && treeStore.currentTab?.store?.docChanged &&
                      <sup className={'ml-0.5'}>*</sup>
                    }
                  </Fragment>
                )}
              </>
            }
          </div>
        </div>
        <div className={'flex items-center pr-3 dark:text-gray-400/70 space-x-1 text-gray-500'}>
          <Update/>
          <Share/>
          <div
            className={'flex items-center justify-center p-1 group'}
            onClick={() => MainApi.openToolMenu(treeStore.openNote?.filePath)}
          >
            <AppstoreOutlined
              className={'text-lg duration-200 dark:group-hover:text-gray-300 group-hover:text-gray-700'}
            />
          </div>
          <User/>
        </div>
      </div>
    </div>
  )
})
