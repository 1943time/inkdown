import {observer} from 'mobx-react-lite'
import {Alert, Button, Form, Input, Modal, Popconfirm, Radio, Space, Tag} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {message$} from '../../utils'
import {useCallback, useEffect} from 'react'
import {action, runInAction} from 'mobx'
import {MainApi} from '../../api/main'
import { useCoreContext } from '../../store/core'
export const ServiceSet = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    error: '',
    loading: false,
  })
  const [form] = Form.useForm()
  useEffect(() => {
    if (props.open) {
      setState({error: ''})
      form.resetFields()
      window.electron.ipcRenderer.invoke('getServerConfig').then(res => {
        if (res) {
          form.setFieldsValue(res)
        } else {
          form.resetFields()
        }
      })
    }
  }, [props.open])

  const setSuccess = useCallback(async (value: any) => {
    value.domain = value.domain.replace(/\/+$/,'')
    const machineId = await MainApi.getMachineId()
    const res = await core.share.api.connect({
      name: value.name,
      machineId,
      domain: value.domain,
      secret: value.secret,
      preferences: {
        codeTabSize: core.config.config.codeTabSize,
        codeTheme: core.config.config.codeTheme
      }
    }).catch(e => {
      if (e.response?.body) {
        const data = JSON.parse(e.response.body)
        throw new Error(data?.message)
      }
      throw new Error('connection failed')
    })
    const config = {
      name: value.name,
      secret: value.secret,
      domain: value.domain,
      deviceId: res.deviceId
    }
    await window.electron.ipcRenderer.invoke('saveServerConfig', config)
    setState({error: ''})
    core.share.initial()
    message$.next({
      type: 'success',
      content: core.config.zh ? '设置成功' : 'Setup successful'
    })
    runInAction(() => {
      core.share.serviceConfig = config
    })
    props.onClose()
  }, [])

  const save = useCallback(() => {
    form.validateFields().then(async value => {
      value.domain = value.domain.replace(/\/+$/,'')
      setState({loading: true})
      try {
        await setSuccess(value)
      } catch (e: any) {
        console.error(e)
        setState({error: e.toString()})
        MainApi.saveServerConfig(null)
      } finally {
        setState({loading: false})
      }
    })
  }, [])

  return (
    <Modal
      open={props.open}
      width={430}
      title={core.config.zh ? '分享服务设置' : 'Shared Service Settings'}
      confirmLoading={state.loading}
      onCancel={props.onClose}
      footer={(
        <Space className={'mt-4'}>
          <Button onClick={props.onClose}>{core.config.zh ? '取消' : 'Cancel'}</Button>
          {!!core.share.serviceConfig &&
            <Popconfirm
              title={core.config.zh ? '提示' : 'Notice'}
              description={core.config.zh ? '重置后将不可分享，已分享数据不会被清除' : 'After resetting, it will not be shareable and shared data will not be cleared'}
              placement={'bottom'}
              onConfirm={() => {
                return core.share.reset().then(() => form.resetFields())
              }}
              okText={core.config.zh ? '确定' : 'Yes'}
              cancelText={core.config.zh ? '取消' : 'No'}
            >
              <Button
                danger={true}
              >
                {core.config.zh ? '重置' : 'Reset'}
              </Button>
            </Popconfirm>
          }
          <Button
            type={'primary'}
            loading={state.loading}
            onClick={save}
          >
            {core.config.zh ? '链接并保存' : 'Connect and save'}
          </Button>
        </Space>
      )}
    >
      <Form form={form} layout={'vertical'} className={'mt-4'}>
        {core.share.currentVersion &&
          <div className={'flex items-center mb-4'}>
            <span className={'mr-4'}>{core.config.zh ? '服务版本' : 'Service Version'}</span>
            <Tag>{core.share.currentVersion}</Tag>
          </div>
        }
        <Form.Item
          rules={[{required: true, message: core.config.zh ? '请输入域名' : 'Please enter domain'}]}
          tooltip={core.config.zh ? '需要http前缀' : 'HTTP prefix required'}
          label={core.config.zh ? '域名或IP' : 'Domain or IP'} name={['domain']}>
          <Input placeholder={`${core.config.zh ? '例如' : 'for example'}: https://www.inkdown.me`}/>
        </Form.Item>
        <Form.Item
          initialValue={'BLUESTONE'}
          tooltip={core.config.zh ? '在服务程序中设置，具体请参考文档' : 'Set in the service program, please refer to the documentation for details'}
          rules={[{required: true, message: core.config.zh ? '请输入secret' : 'Please enter secret'}]}
          label={'Secret'} name={['secret']}>
          <Input/>
        </Form.Item>
        <Form.Item
          rules={[{required: true, message: core.config.zh ? '请输入设备名称' : 'Please enter device name'}]}
          tooltip={core.config.zh ? '自由填写，同步文件将与此设备绑定' : 'Free to fill in, Synced files will be bound to the device'}
          label={core.config.zh ? '设备名称' : 'Device Name'} name={['name']}>
          <Input/>
        </Form.Item>
      </Form>
      {state.error &&
        <Alert message={state.error} type={'error'} className={'mt-4 whitespace-pre overflow-auto'}/>
      }
    </Modal>
  )
})
