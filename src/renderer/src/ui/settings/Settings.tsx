import { observer } from 'mobx-react-lite'
import { FileBox, KeyboardIcon, PenLine, X } from 'lucide-react'
import { useStore } from '@/store/store'
import { SetEditor } from './Editor'
import { Keyboard } from './Keyboard'

const tabs = [
  {
    key: 1,
    label: 'Editor',
    icon: <PenLine size={16} />
  },
  {
    key: 2,
    label: 'Model',
    icon: <FileBox size={16} />
  },
  {
    key: 3,
    label: 'Keyboard',
    icon: <KeyboardIcon size={16} />
  }
]
export const Settings = observer(() => {
  const core = useStore()
  if (!core.settings.data.open) return null
  return (
    <div className={`fixed inset-0 z-[2200] dark:bg-black/30 bg-black/10`}>
      <div
        className={'w-full h-full flex items-center justify-center overflow-auto py-10 flex-wrap'}
        onClick={() => {
          core.settings.setData((data) => {
            data.open = false
          })
        }}
      >
        <div
          className={'min-w-[500px] ink-modal w-4/5 max-w-[900px] relative overflow-hidden'}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={
              'z-[10] p-1 flex items-center cursor-pointer dark:text-gray-400 text-gray-500 duration-200 hover:bg-gray-100 rounded dark:hover:bg-gray-500/30 absolute right-3 top-2.5'
            }
            onClick={() => {
              core.settings.setData((data) => {
                data.open = false
              })
            }}
          >
            <X size={20} />
          </div>
          <div className={'flex'}>
            <div
              className={
                'pt-4 w-[230px] border-r b1 dark:bg-neutral-800 bg-gray-100 rounded-tl-lg rounded-bl-lg flex flex-col'
              }
            >
              <div className={'flex-1 px-2'}>
                <div className={'mb-4 px-2 text-black/70 dark:text-white/70 text-sm font-semibold'}>
                  Settings
                </div>
                <div className={'space-y-1'}>
                  {tabs.map((item) => (
                    <div
                      key={item.label}
                      onClick={() =>
                        core.settings.setData((data) => {
                          data.setTab = item.key
                        })
                      }
                      className={`py-1 h-7 flex items-center cursor-pointer px-3 text-[13px] rounded  ${
                        core.settings.data.setTab === item.key
                          ? 'bg-blue-500/80 text-gray-100'
                          : 'dark:hover:bg-gray-400/10 hover:bg-gray-500/10 text-gray-600 dark:text-gray-200'
                      }`}
                    >
                      {item.icon}
                      <span className={'ml-2'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={'flex-1'}>
              <div
                className={
                  'border-b text-base font-medium h-12 items-center flex dark:text-gray-200 text-gray-700 b1 relative px-4'
                }
              >
                <div>{tabs.find((t) => t.key === core.settings.data.setTab)?.label}</div>
              </div>
              <div
                className={' text-gray-600 dark:text-gray-300 px-2 py-2 h-[500px] overflow-y-auto'}
              >
                {core.settings.data.setTab === 1 && <SetEditor />}
                {core.settings.data.setTab === 3 && <Keyboard />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
