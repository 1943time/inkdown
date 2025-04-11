import { Tabs } from 'antd'
import { ModelSettings } from './Model'
import { ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/store'

export function Settings() {
  const store = useStore()
  const activeTab = store.settings.useState((state) => state.tab)
  return (
    <div
      className={
        'absolute inset-0 z-50 flex flex-col px-5 items-center border-t border-white/10 primary-bg-color'
      }
    >
      <div
        className={
          'flex items-center space-x-1 absolute top-2 left-2 hover:bg-white/5 duration-200 py-1 pr-2 pl-1 rounded cursor-pointer'
        }
        onClick={() => {
          store.settings.useState.setState({ open: false })
        }}
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </div>
      <div className={'pt-10'}>
        <Tabs
          size={'small'}
          accessKey={activeTab}
          onChange={(key) => {
            store.settings.useState.setState({ tab: key })
          }}
          items={[
            {
              key: 'model',
              label: 'Models'
            },
            {
              key: 'general',
              label: 'General'
            },
            {
              key: 'chat',
              label: 'Editor'
            },
            {
              key: 'prompt',
              label: 'Prompt'
            }
          ]}
        />
      </div>
      <div className={'flex-1 flex-shrink-0 w-full overflow-auto min-h-0'}>
        <div className={'max-w-[1000px] mx-auto'}>{activeTab === 'model' && <ModelSettings />}</div>
      </div>
    </div>
  )
}
