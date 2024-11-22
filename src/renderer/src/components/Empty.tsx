import { observer } from 'mobx-react-lite'
import { CloseOutlined, HistoryOutlined } from '@ant-design/icons'
import logo from '../../../../resources/icon.png?asset'
import { useLayoutEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { db, ISpace } from '../store/db'
import { Icon } from '@iconify/react'
import { editSpace$ } from './space/EditSpace'
import { keyTask$ } from '../hooks/keyboard'
import { useCoreContext } from '../store/core'
import { useTranslation } from 'react-i18next'

export const Empty = observer(() => {
  const core = useCoreContext()
  const {t} = useTranslation()
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
  }, [])
  if (core.tree.loading) return null
  return (
    <div
      className={'flex justify-center items-center h-[calc(100vh_-_40px)] overflow-y-auto py-10'}
    >
      <div className={'relative -top-12'}>
        <div className={'flex-col space-y-5 dark:text-white/70 text-black/60 '}>
          <div className={'dark:text-gray-400 text-gray-600 flex items-center'}>
            <img
              src={logo}
              alt=""
              className={'w-5 h-5 mr-2 dark:shadow-none shadow shadow-gray-300 rounded'}
            />
            Inkdown
          </div>
          <div className={'text-base text-gray-500'}>
            {t('noOpenFiles')}
          </div>
          <div
            className={
              'dark:hover:text-white hover:text-black cursor-pointer duration-200 flex items-center'
            }
            onClick={() => {
              keyTask$.next({ key: 'newNote' })
            }}
          >
            <Icon icon={'mingcute:file-new-line'} className={'text-lg'} />
            <span className={'ml-2'}>{t('newDoc')}</span>
          </div>
          {!core.tree.root && (
            <div
              className={
                'dark:hover:text-white hover:text-black cursor-pointer duration-200 flex items-center'
              }
              onClick={() => {
                keyTask$.next({ key: 'openNote' })
              }}
            >
              <Icon icon={'tabler:file-text'} className={'text-lg'} />
              <span className={'ml-2'}>{t('openDoc')}</span>
            </div>
          )}
          {!!core.tree.root && (
            <>
              <div
                className={'cursor-pointer dark:hover:text-white hover:text-black duration-200'}
                onClick={() => {
                  keyTask$.next({ key: 'quickOpen' })
                }}
              >
                <HistoryOutlined />
                <span className={'ml-2'}>
                  {t('recentlyDoc')}
                </span>
              </div>
              {core.tree.tabs.length > 1 && (
                <div
                  className={'cursor-pointer dark:hover:text-white hover:text-black duration-200'}
                  onClick={() => {
                    core.tree.removeTab(core.tree.currentIndex)
                  }}
                >
                  <CloseOutlined />
                  <span className={'ml-2'}>{t('close')}</span>
                </div>
              )}
            </>
          )}
          {!core.tree.root && (
            <>
              <div
                className={
                  'cursor-pointer dark:hover:text-white hover:text-black duration-200 flex items-center'
                }
                onClick={() => {
                  editSpace$.next(null)
                }}
              >
                <Icon icon={'material-symbols:workspaces-outline'} className={'text-lg'} />
                <span className={'ml-2'}>
                  {t('createWorkspace')}
                </span>
              </div>
            </>
          )}
        </div>
        {!core.tree.root && !!state.spaces.length && (
          <div className={'mt-6'}>
            <div className={'text-gray-500'}>
              {t('recentlySpace')}
            </div>
            <div className={'mt-2'}>
              {state.spaces.map((r) => (
                <div
                  className={'flex items-center py-1 dark:text-gray-300 text-gray-700 text-base'}
                  key={r.cid}
                  onClick={() => {
                    core.tree.initial(r.cid)
                  }}
                >
                  <span
                    className={
                      'cursor-pointer dark:hover:text-white hover:text-black duration-200 flex items-center'
                    }
                  >
                    <Icon icon={'material-symbols:workspaces-outline'} />
                    <span className={'ml-2'}>{r.name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
