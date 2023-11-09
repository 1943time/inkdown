import {observer} from 'mobx-react-lite'
import {Alert, Button, Form, Input, Modal, Radio} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {message$} from '../utils'
import {useCallback, useEffect} from 'react'
import {runInAction} from 'mobx'
import {MainApi} from '../api/main'
import {shareStore} from './store'
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
        console.log('res', res)
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
      secret: value.secret
    }).catch(e => {
      if (e.response.body) {
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
    message$.next({
      type: 'success',
      content: 'Setup successful'
    })
    runInAction(() => {
      shareStore.serviceConfig = config
    })
    props.onClose()
  }, [])
  return (
    <Modal
      open={props.open}
      width={700}
      title={'Shared Service Settings'}
      confirmLoading={state.loading}
      onOk={async () => {
        form.validateFields().then(async value => {
          value.domain = value.domain.replace(/\/+$/,'')
          setState({loading: true})
          try {
            await setSuccess(value)
          } catch (e: any) {
            console.error(e)
            setState({error: e.toString()})
            window.electron.ipcRenderer.invoke('set-service-config', null)
          } finally {
            setState({loading: false})
          }
        })
      }}
      onCancel={props.onClose}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-4'}>
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
