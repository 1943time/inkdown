import { useStore } from '@/store/store'
import { GlobalOutlined } from '@ant-design/icons'
import { Hero } from '@lobehub/ui/awesome'
import { Button } from 'antd'
import { observer } from 'mobx-react-lite'

export const ChatEmpty = observer(() => {
  const store = useStore()
  return (
    <div className="flex h-full items-center justify-center relative flex-col pb-20 px-5">
      <div className={'max-w-96 text-center'}>
        <div className="text-2xl font-bold">ChatBot</div>
        <div className="text-gray-400 mt-5 text-sm">
          您可以通过配置 API Key 接入多种大模型平台，使用 @
          符号引用文档，或选择工作区文档作为对话上下文。
        </div>
        {!store.settings.state.models.length && (
          <div className={'mt-5 px-10'}>
            <Button
              block={true}
              type={'primary'}
              icon={<GlobalOutlined />}
              onClick={() => {
                store.settings.setData((state) => {
                  state.open = true
                  state.setTab = 2
                })
              }}
            >
              设置模型
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
