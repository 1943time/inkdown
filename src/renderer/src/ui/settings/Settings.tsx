import { Tabs } from 'antd'
import { ModelSettings } from './Model'
import { ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/store'
import { observer } from 'mobx-react-lite'

export const Settings = observer(() => {
  const store = useStore()
  return (
    <div
      className={
        'absolute inset-0 z-50 flex flex-col px-5 items-center border-t border-white/10 dark:bg-neutral-950'
      }
    >
      <div
        className={
          'flex items-center space-x-1 absolute top-2 left-2 hover:bg-white/5 duration-200 py-1 pr-2 pl-1 rounded cursor-pointer'
        }
        onClick={() => {
          store.settings.setState({ open: false })
        }}
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </div>
      <div className={'pt-10'}>
        <Tabs
          size={'small'}
          accessKey={store.settings.state.tab}
          onChange={(key) => {
            store.settings.setState({ tab: key })
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
        <div className={'max-w-[1000px] mx-auto'}>
          {store.settings.state.tab === 'model' && <ModelSettings />}
        </div>
      </div>
    </div>
  )
})
