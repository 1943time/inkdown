import { Dropdown } from 'antd'
import { modelToLabel } from '@/utils/ai'
import { Bolt, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/store'
import { ModelIcon } from './ModelIcon'
import { Tooltip } from '@lobehub/ui'
import { useMemo } from 'react'
import { OpenAI } from '@lobehub/icons'
import { useSetState } from 'react-use'
import { observer } from 'mobx-react-lite'
export const SwitchModel = observer(() => {
  const store = useStore()
  const chat = store.chat.state.activeChat
  const { model, models, ready } = store.settings.state

  const chatModel = useMemo(() => {
    if (chat?.clientId) {
      const config = models.find((item) => item.id === chat.clientId)
      if (config) {
        return {
          id: config.id,
          model: chat.model || config.models[0],
          mode: config.mode
        }
      }
    } else {
      return model
    }
  }, [chat, model, models, ready])
  const [state, setState] = useSetState({
    open: false
  })
  return (
    <Dropdown
      trigger={['click']}
      open={state.open}
      onOpenChange={(v) => setState({ open: v })}
      menu={{
        className: 'switch-model-menu',
        style: {
          maxHeight: '400px'
        },
        onClick: (item) => {
          const [id, model] = item.key.split('::')
          store.chat.setChatModel(id, model)
        },
        items: models.map((item) => ({
          children: item.models.map((m) => {
            return {
              label: modelToLabel(m),
              key: `${item.id}::${m}`
            }
          }),
          type: 'group',
          label: (
            <div className={'flex items-center justify-between'}>
              <div className={'flex items-center space-x-2'}>
                <ModelIcon mode={item.mode} size={16} />
                <span className={'text-sm text-gray-400'}>{modelToLabel(item.mode)}</span>
              </div>
              <Tooltip title={'前往设置'} mouseEnterDelay={0.5}>
                <div
                  className={'action p-1'}
                  onClick={() => {
                    store.settings.setState({ open: true })
                    setState({ open: false })
                  }}
                >
                  <Bolt size={14} />
                </div>
              </Tooltip>
            </div>
          ),
          key: item.mode
        }))
      }}
    >
      <div className={'flex items-center justify-between p-2 rounded-lg h-7 cursor-pointer'}>
        {ready && (
          <>
            <div className={'flex items-center'}>
              {chatModel ? (
                <ModelIcon mode={chatModel.mode} size={17} />
              ) : (
                <OpenAI.Avatar size={20} />
              )}
              <span className={'ml-1.5 text-sm flex-1 dark:text-white/90'}>
                {chatModel ? modelToLabel(chatModel.model) : '您暂未添加模型'}
              </span>
            </div>
            <div className={'flex items-center ml-1 text-white/50'}>
              <ChevronDown size={16} />
            </div>
          </>
        )}
      </div>
    </Dropdown>
  )
})
