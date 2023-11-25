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
        codeTheme: configStore.config.codeTheme
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
      content: 'Setup successful'
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
      title={'Shared Service Settings'}
      confirmLoading={state.loading}
      onCancel={props.onClose}
      footer={(
        <Space className={'mt-4'}>
          <Button onClick={props.onClose}>{'Cancel'}</Button>
          {!!shareStore.serviceConfig &&
            <Popconfirm
              title="Note"
              description="Network services will be suspended after reset"
              placement={'bottom'}
              onConfirm={() => {
                return shareStore.reset().then(() => form.resetFields())
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button
                danger={true}
              >
                Reset
              </Button>
            </Popconfirm>
          }
          <Button
            type={'primary'}
            loading={state.loading}
            onClick={save}
          >
            Connect and save
          </Button>
        </Space>
      )}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-4'}>
        {shareStore.currentVersion &&
          <Form.Item
            label={'Service Version'}>
            <Tag>{shareStore.currentVersion}</Tag>
          </Form.Item>
        }
        <Form.Item
          rules={[{required: true, message: 'Please enter domain'}]}
          label={'Domain or IP'} name={['domain']}>
          <Input placeholder={'for example: https://www.bluemd.me'}/>
        </Form.Item>
        <Form.Item
          initialValue={'BLUESTONE'}
          rules={[{required: true, message: 'Please enter secret'}]}
          label={'Secret'} name={['secret']}>
          <Input/>
        </Form.Item>
        <Form.Item
          rules={[{required: true, message: 'Please enter device name'}]}
          tooltip={'Synced files will be bound to the device'}
          label={'Device Name'} name={['name']}>
          <Input/>
        </Form.Item>
      </Form>
      {state.error &&
        <Alert message={state.error} type={'error'} className={'mt-4 whitespace-pre overflow-auto'}/>
      }
    </Modal>
  )
})
