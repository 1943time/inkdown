import {observer} from 'mobx-react-lite'
import {useSubject} from '../../hooks/subscribe'
import {useCallback} from 'react'
import {nanoid} from 'nanoid'
import {Button, notification, Space} from 'antd'
import {Subject} from 'rxjs'
import {message$} from '../../utils'
import { useCoreContext } from '../../store/core'
export const shareSuccessfully$ = new Subject<string>()
export const Successfully = observer(() => {
  const core = useCoreContext()
  const [api, contextHolder] = notification.useNotification()
  const copyDocUrl = useCallback((url: string) => {
    window.api.copyToClipboard(url)
    message$.next({
      type: 'success',
      content: core.config.zh ? '已复制到剪贴板' : 'Copied to clipboard'
    })
  }, [])
  useSubject(shareSuccessfully$, (url: string) => {
    const key = nanoid()
    api.success({
      key,
      message: core.config.zh ? '同步成功' : 'Synchronization succeeded',
      duration: 3,
      btn: (
        <Space>
          <Button
            onClick={() => {
              api.destroy(key)
              copyDocUrl(url)
            }}
          >
            {core.config.zh ? '复制链接' : 'Copy Link'}
          </Button>
          <Button
            type={'primary'}
            onClick={() => {
              window.open(url)
              api.destroy(key)
            }}
          >
            {core.config.zh ? '打开' : 'Open'}
          </Button>
        </Space>
      )
    })
  })
  return (
    <>{contextHolder}</>
  )
})
