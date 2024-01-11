import {observer} from 'mobx-react-lite'
import {Button, Modal, notification, Progress, Space} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {message$} from '../utils'
import {configStore} from '../store/config'
import {openConfirmDialog$} from './ConfirmDialog'
const ipcRenderer = window.electron.ipcRenderer
export const Update = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    startUpdate: false,
    percent: 0,
    manual: false,
    updateData: {
      tag: '',
      releaseNotes: '',
      releaseDate: '',
      version: '',
      files: [] as {url: string}[]
    }
  })
  const downLoad = useCallback(() => {
    const file = state.updateData.files.find(f => f.url.endsWith('.dmg'))
    if (file) {
      window.open(`https://github.com/1943time/bluestone/releases/latest`)
    }
  }, [])

  const [api, contextHolder] = notification.useNotification()
  const [modal, context] = Modal.useModal()
  useEffect(() => {
    ipcRenderer.on('update-available', (e, data) => {
      if (state.startUpdate) return
      setState({open: !!data, updateData: data})
    })
    ipcRenderer.on('check-updated', e => {
      setState({manual: true})
    })
    ipcRenderer.on('update-progress', (e, data) => {
      const percent = (data.percent as number || 0).toFixed(1)
      setState({percent: +percent})
    })

    ipcRenderer.on('update-not-available', (e, manual) => {
      if (!manual) return
      message$.next({
        type: 'info',
        content: configStore.zh ? '没有可用的更新' : 'No updates are available'
      })
    })

    ipcRenderer.on('update-error', (e, err) => {
      console.error('update-error', err)
      if (state.startUpdate || state.manual) {
        let msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'The network is abnormal, please try again later or download manually'
        api.error({
          message: configStore.zh ? '更新失败' : 'The update failed',
          description: msg
        })
      }
      setState({startUpdate: false, percent: 0, manual: false})
    })
    ipcRenderer.on('update-downloaded', e => {
      setState({startUpdate: false, percent: 0})
      openConfirmDialog$.next({
        title: configStore.zh ? '下载更新已完成，是否立即重新启动？' : 'Download the update is complete, do you want to restart it now?',
        okText: 'Restart now',
        onConfirm: () => {
          ipcRenderer.send('install-update')
        },
        onCancel: () => {
          setState({
            startUpdate: false,
            percent: 0
          })
        }
      })
    })
  }, [])
  return (
    <>
      {contextHolder}
      {context}
      <div
        className={`w-28 mr-2 hover:bg-black/10 rounded px-2 cursor-pointer ${state.startUpdate ? '' : 'hidden'}`}
        onClick={() => setState({open: true})}
      >
        <Progress percent={state.percent} className={'m-0'}/>
      </div>
      <Modal
        title={`Update Bluestone-${state.updateData.tag}`}
        width={600}
        onCancel={() => setState({open: false})}
        open={state.open}
        footer={(
          <Space className={'mt-4'}>
            {state.startUpdate ? (
              <>
                <Button onClick={downLoad}>{'Download manually'}</Button>
                <Button
                  onClick={() => {
                    ipcRenderer.send('cancel-update')
                    setState({startUpdate: false, percent: 0})
                  }}
                >
                  {configStore.zh ? '取消更新' : 'Cancel update'}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={downLoad}>{'Download manually'}</Button>
                <Button
                  type={'primary'}
                  onClick={() => {
                    ipcRenderer.send('start-update')
                    setState({startUpdate: true, open: false})
                  }}
                >
                  {configStore.zh ? '立即更新' : 'Update now'}
                </Button>
              </>
            )}
          </Space>
        )}
      >
        <div
          dangerouslySetInnerHTML={{__html: state.updateData.releaseNotes}}
          className={'py-2'}
        />
        {state.startUpdate &&
          <div className={'flex items-center mt-4'}>
            <span className={'mr-4'}>{'Updating'}</span>
            <Progress percent={state.percent} className={'flex-1 mb-0'}/>
          </div>
        }
      </Modal>
    </>
  )
})
