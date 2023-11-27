import {observer} from 'mobx-react-lite'
import {useSubject} from '../../hooks/subscribe'
import {useCallback} from 'react'
import {nanoid} from 'nanoid'
import {Button, notification, Space} from 'antd'
import {Subject} from 'rxjs'
import {message$} from '../../utils'
export const shareSuccessfully$ = new Subject<string>()
export const Successfully = observer(() => {
  const [api, contextHolder] = notification.useNotification()
  const copyDocUrl = useCallback((url: string) => {
    window.api.copyToClipboard(url)
    message$.next({
      type: 'success',
      content: 'Copied to clipboard'
    })
  }, [])
  useSubject(shareSuccessfully$, (url: string) => {
    const key = nanoid()
    api.success({
      key,
      message: 'Synchronization succeeded',
      duration: 3,
      btn: (
        <Space>
          <Button
            onClick={() => {
              api.destroy(key)
              copyDocUrl(url)
            }}
          >
            Copy Link
          </Button>
          <Button
            type={'primary'}
            onClick={() => {
              window.open(url)
              api.destroy(key)
            }}
          >
            Open
          </Button>
        </Space>
      )
    })
  })
  return (
    <>{contextHolder}</>
  )
})
