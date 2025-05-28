import { useStore } from '@/store/store'
import { GlobalOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export const ChatEmpty = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12 && hour > 4) {
      return t('chat.greeting.morning')
    } else if (hour > 12 && hour < 19) {
      return t('chat.greeting.afternoon')
    } else {
      return t('chat.greeting.evening')
    }
  }, [t])
  return (
    <div className="flex h-full items-center justify-center relative flex-col pb-20 px-5">
      <div className={'max-w-96 text-center'}>
        <div className="text-2xl font-bold">ChatBot, {greeting}</div>
        {!store.settings.state.models.length && (
          <>
            <div className="text-gray-400 mt-5 text-sm">{t('chat.chatbot_intro')}</div>
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
                {t('chat.set_model')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
})
