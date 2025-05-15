import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { useGetSetState } from 'react-use'
import { CloseOutlined } from '@ant-design/icons'
import { useStore } from '@/store/store'
import { IDoc } from 'types/model'
import { ISort } from '@/icons/keyboard/ISort'
import { IEnter } from '@/icons/keyboard/Enter'
import Command from '@/icons/keyboard/Command'
import { os } from '@/utils/common'
import { ScrollList } from '@/ui/common/ScrollList'
import { useTranslation } from 'react-i18next'

export const QuickOpen = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const [state, setState] = useGetSetState({
    records: [] as (IDoc & { path: string })[],
    filterRecords: [] as (IDoc & { path: string })[],
    query: ''
  })
  useEffect(() => {
    if (store.note.state.showQuickOpen) {
      const data = Object.values(store.note.state.nodes)
        .sort((a, b) => {
          if (a.lastOpenTime && b.lastOpenTime) {
            return b.lastOpenTime - a.lastOpenTime
          }
          return 0
        })
        .filter((d) => !d.folder)
        .map((r) => {
          return {
            ...r,
            path: store.note.getDocPath(r).join('/')
          }
        })
      setState({
        records: data,
        filterRecords: data.filter((q) => !state().query || q.path.includes(state().query))
      })
    }
  }, [store.note.state.showQuickOpen])
  const close = useCallback(() => {
    store.note.setState({ showQuickOpen: false })
  }, [])
  if (!store.note.state.showQuickOpen) return null
  return (
    <div className={'z-[1000] fixed inset-0 dark:bg-black/30 bg-black/10'} onClick={close}>
      <div
        className={
          'mt-20 w-[600px] ctx-panel rounded-lg mx-auto relative dark:shadow-black/30 shadow-sm shadow-black/10'
        }
        onClick={(e) => e.stopPropagation()}
      >
        <input
          className={
            'bg-transparent outline-none h-10 w-full px-4 dark:text-gray-200 text-gray-600 dark:placeholder-gray-200/50 placeholder-gray-400'
          }
          placeholder={t('editor.quickOpen.findRecentNote')}
          autoFocus={true}
          value={state().query}
          onChange={(e) => {
            const query = e.target.value.toLowerCase()
            setState({
              query,
              filterRecords: state().records.filter((q) => q.path?.toLowerCase().includes(query))
            })
          }}
        />
        <div className={'absolute right-2 top-0 h-10 flex items-center flex-wrap'}>
          <div
            className={
              'w-[18px] h-[18px] dark:bg-white/15 dark:text-white/60 dark:hover:bg-white/20 text-black/60 rounded-full bg-black/10 flex justify-center items-center hover:bg-black/15 duration-200 cursor-pointer'
            }
            onClick={close}
          >
            <CloseOutlined className={'text-xs scale-75'} />
          </div>
        </div>
        <div className={'h-[1px] bg-gray-200 dark:bg-gray-200/20'} />
        <div className={'p-2'}>
          <ScrollList
            items={state().filterRecords}
            style={{ maxHeight: 300 }}
            onClose={close}
            onSelect={(item) => {
              close()
              store.note.openDoc(store.note.state.nodes[item.id])
            }}
            renderItem={(item, index) => (
              <div
                className={`cursor-default px-3 py-1 rounded dark:text-gray-300 text-gray-600 text-sm`}
                key={item.id}
              >
                {item.path}
              </div>
            )}
          />
        </div>
        <div className={`px-4 py-2 ${!state().filterRecords.length ? '' : 'hidden'}`}>
          <div className={'text-gray-500 text-center text-sm'}>
            {t('editor.quickOpen.noRecords')}
          </div>
        </div>
        <div
          className={
            'flex items-center h-8 border-t dark:border-white/5 dark:text-white/60 px-3 text-black/60 border-black/5'
          }
        >
          <ISort />
          <span className={'text-xs ml-1'}>{t('editor.quickOpen.navigation')}</span>
          <IEnter className={'ml-4'} />
          <span className={'text-xs ml-1'}>{t('editor.quickOpen.open')}</span>
          {os() === 'mac' ? (
            <Command className={'ml-4 text-sm'} />
          ) : (
            <span className={'ml-4 text-xs'}>Ctrl</span>
          )}
          <IEnter className={'ml-0.5'} />
          <span className={'text-xs ml-1'}>{t('editor.quickOpen.openInNewTab')}</span>
          <span className={'text-xs ml-4'}>
            <span className={'font-bold'}>esc</span> {t('editor.quickOpen.close')}
          </span>
        </div>
      </div>
    </div>
  )
})
