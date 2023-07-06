import {observer} from 'mobx-react-lite'
import {Button, Modal, notification, Progress, Space} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {message$} from '../utils'
const ipcRenderer = window.electron.ipcRenderer
export const Update = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    startUpdate: false,
    percent: 0,
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
      window.open(`https://github.com/1943time/bluestone/releases/download/${state.updateData.tag}/${file.url}`)
    }
  }, [])

  const [api, contextHolder] = notification.useNotification()
  const [modal, context] = Modal.useModal()
  useEffect(() => {
    ipcRenderer.on('update-available', (e, data) => {
      console.log('update-available', data)
      setState({open: !!data, updateData: data})
    })

    ipcRenderer.on('update-progress', (e, data) => {
      const percent = (data.percent as number || 0).toFixed(1)
      setState({percent: +percent})
    })

    ipcRenderer.on('update-not-available', (e, manual) => {
      if (!manual) return
      message$.next({
        type: 'info',
        content: '暂无可用更新'
      })
    })

    ipcRenderer.on('update-error', (e, err) => {
      console.error('update-error', err)
      setState({startUpdate: false, percent: 0})
      api.error({
        message: '更新失败',
        description: typeof err === 'string' ? err : '网络异常，请稍后再试或手动下载'
      })
    })
    ipcRenderer.on('update-downloaded', e => {
      setState({startUpdate: false, percent: 0})
      modal.confirm({
        type: 'warning',
        content: '下载更新已完成，是否立即重启？',
        onOk: () => {
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
        title={`更新BlueStone-${state.updateData.tag}`}
        width={600}
        onCancel={() => setState({open: false})}
        open={state.open}
        footer={(
          <Space>
            {state.startUpdate ? (
              <>
                <Button onClick={downLoad}>手动下载</Button>
                <Button
                  onClick={() => {
                    ipcRenderer.send('cancel-update')
                    setState({startUpdate: false, percent: 0})
                  }}
                >
                  取消更新
                </Button>
              </>
            ) : (
              <>
                <Button onClick={downLoad}>手动下载</Button>
                <Button
                  type={'primary'}
                  onClick={() => {
                    ipcRenderer.send('start-update')
                    setState({startUpdate: true, open: false})
                  }}
                >
                  立即更新
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
          <Progress percent={state.percent} className={'mt-4'}/>
        }
      </Modal>
    </>
  )
})
