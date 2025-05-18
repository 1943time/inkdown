import { observer } from 'mobx-react-lite'
import { CloseOutlined, HistoryOutlined } from '@ant-design/icons'
import logo from '../../assets/logo.svg'
import { useStore } from '@/store/store'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Empty = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  return (
    <div
      className={'flex justify-center items-center h-[calc(100vh_-_40px)] overflow-y-auto py-10'}
    >
      <div className={'relative -top-12 text-base'}>
        <div className={'flex-col space-y-5 dark:text-white/70 text-black/70'}>
          <div className={'dark:text-gray-400 text-gray-600 flex items-center'}>
            <img
              src={logo}
              alt=""
              className={'w-5 h-5 mr-2 dark:shadow-none shadow shadow-gray-300 rounded'}
            />
            Inkdown
          </div>
          <div className={'text-base text-gray-500'}>{t('noOpenFiles')}</div>
          <div
            className={
              'hover:text-black/90 dark:hover:text-white/90 cursor-pointer duration-200 flex items-center'
            }
            onClick={() => {
              store.keyboard.run('newDoc')
            }}
          >
            <FileText size={16} />
            <span className={'ml-2'}>{t('newDoc')}</span>
          </div>
          <div
            className={'cursor-pointer duration-200 hover:text-black/90 dark:hover:text-white/90'}
            onClick={() => {
              store.keyboard.run('quickOpenNote')
            }}
          >
            <HistoryOutlined />
            <span className={'ml-2'}>{t('recentlyOpenedFiles')}</span>
          </div>
          {store.note.state.tabs.length > 1 && (
            <div
              className={'cursor-pointer duration-200 hover:text-black/90 dark:hover:text-white/90'}
              onClick={() => {
                store.note.removeTab(store.note.state.tabIndex)
              }}
            >
              <CloseOutlined />
              <span className={'ml-2'}>{t('close')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
