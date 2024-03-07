import {observer} from 'mobx-react-lite'
import {Alert, Button, Form, Input, Modal, Popconfirm, Radio, Space, Tag} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {message$} from '../../utils'
import {useCallback, useEffect} from 'react'
import {action, runInAction} from 'mobx'
import {MainApi} from '../../api/main'
import {shareStore} from '../store'
import {configStore} from '../../store/config'
export const ServiceSet = observer((props: {
  open: boolean
  onClose: () => void
}) => {
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
    const res = await shareStore.api.connect({
      name: value.name,
      machineId,
      domain: value.domain,
      secret: value.secret,
      preferences: {
        codeTabSize: configStore.config.codeTabSize,
        codeTheme: configStore.config.codeTheme,
        codeLineNumber: configStore.config.codeLineNumber
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
    shareStore.initial()
    message$.next({
      type: 'success',
      content: configStore.zh ? '设置成功' : 'Setup successful'
    })
    runInAction(() => {
      shareStore.serviceConfig = config
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
      width={700}
      title={configStore.zh ? '分享服务设置' : 'Shared Service Settings'}
      confirmLoading={state.loading}
      onCancel={props.onClose}
      footer={(
        <Space className={'mt-4'}>
          <Button onClick={props.onClose}>{configStore.zh ? '取消' : 'Cancel'}</Button>
          {!!shareStore.serviceConfig &&
            <Popconfirm
              title={configStore.zh ? '提示' : 'Notice'}
              description={configStore.zh ? '重置后将不可分享，已分享数据不会被清除' : 'After resetting, it will not be shareable and shared data will not be cleared'}
              placement={'bottom'}
              onConfirm={() => {
                return shareStore.reset().then(() => form.resetFields())
              }}
              okText={configStore.zh ? '确定' : 'Yes'}
              cancelText={configStore.zh ? '取消' : 'No'}
            >
              <Button
                danger={true}
              >
                {configStore.zh ? '重置' : 'Reset'}
              </Button>
            </Popconfirm>
          }
          <Button
            type={'primary'}
            loading={state.loading}
            onClick={save}
          >
            {configStore.zh ? '链接并保存' : 'Connect and save'}
          </Button>
        </Space>
      )}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-4'}>
        {shareStore.currentVersion &&
          <Form.Item
            label={configStore.zh ? '服务版本' : 'Service Version'}>
            <Tag>{shareStore.currentVersion}</Tag>
          </Form.Item>
        }
        <Form.Item
          rules={[{required: true, message: configStore.zh ? '请输入域名' : 'Please enter domain'}]}
          tooltip={configStore.zh ? '需要http前缀' : 'HTTP prefix required'}
          label={configStore.zh ? '域名或IP' : 'Domain or IP'} name={['domain']}>
          <Input placeholder={`${configStore.zh ? '例如' : 'for example'}: https://www.bluemd.me`}/>
        </Form.Item>
        <Form.Item
          initialValue={'BLUESTONE'}
          tooltip={configStore.zh ? '在服务程序中设置，具体请参考文档' : 'Set in the service program, please refer to the documentation for details'}
          rules={[{required: true, message: configStore.zh ? '请输入secret' : 'Please enter secret'}]}
          label={'Secret'} name={['secret']}>
          <Input/>
        </Form.Item>
        <Form.Item
          rules={[{required: true, message: configStore.zh ? '请输入设备名称' : 'Please enter device name'}]}
          tooltip={configStore.zh ? '自由填写，同步文件将与此设备绑定' : 'Free to fill in, Synced files will be bound to the device'}
          label={configStore.zh ? '设备名称' : 'Device Name'} name={['name']}>
          <Input/>
        </Form.Item>
      </Form>
      {state.error &&
        <Alert message={state.error} type={'error'} className={'mt-4 whitespace-pre overflow-auto'}/>
      }
    </Modal>
  )
})
