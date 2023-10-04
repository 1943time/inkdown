import {observer} from 'mobx-react-lite'
import {Alert, Form, Input, Modal, Radio} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {message$} from '../utils'
import {useEffect} from 'react'
import {runInAction} from 'mobx'
import {configStore} from '../store/config'

export const ServiceSet = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    error: '',
    loading: false
  })
  const [form] = Form.useForm()
  useEffect(() => {
    if (props.open) {
      window.electron.ipcRenderer.invoke('get-service-config').then(res => {
        if (res) {
          form.setFieldsValue(res)
        } else {
          form.resetFields()
        }
      })
    }
  }, [props.open])
  return (
    <Modal
      open={props.open}
      width={700}
      title={'Shared Service Settings'}
      confirmLoading={state.loading}
      onOk={async () => {
        const value = form.getFieldsValue()
        setState({loading: true})
        try {
          await window.electron.ipcRenderer.invoke('set-service-config', value)
          if (value.type === 'ssh') {
            await window.api.service.initialSsh(value)
          }
          setState({error: ''})
          message$.next({
            type: 'success',
            content: 'Setup successful'
          })
          runInAction(() => {
            configStore.serviceConfig = value
          })
          props.onClose()
        } catch (e: any) {
          console.error(e)
          setState({error: e.toString()})
          window.electron.ipcRenderer.invoke('set-service-config', null)
        } finally {
          setState({loading: false})
        }
      }}
      onCancel={props.onClose}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-4'}>
        <Form.Item label={'Synchronous mode'} name={'type'} initialValue={'ssh'}>
          <Radio.Group>
            <Radio value={'ssh'}>SSH</Radio>
            <Radio value={'custom'}>Custom</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle={true} shouldUpdate={(prevValues, nextValues) => prevValues.type !== nextValues.type}>
          {() =>
            <>
              {form.getFieldValue('type') === 'ssh' &&
                <>
                  <Form.Item
                    label={'Host'} name={['host']}
                    rules={[{required: true, message: 'Please enter the correct host address'}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item
                    label={'Username'} name={['username']}
                    rules={[{required: true, message: 'Please enter username'}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item
                    label={'Password'} name={['password']}
                    rules={[{required: true, message: 'Please enter password'}]}>
                    <Input type={'password'}/>
                  </Form.Item>
                  <Form.Item
                    initialValue={'22'}
                    label={'Port'} name={['port']}>
                    <Input/>
                  </Form.Item>
                  <Form.Item
                    rules={[{required: true, message: 'Please enter the storage folder path'}]}
                    label={'Storage directory'} name={['target']}>
                    <Input/>
                  </Form.Item>
                  <Form.Item
                    rules={[{required: true, message: 'Please enter domain'}]}
                    label={'Domain'} name={['domain']}>
                    <Input placeholder={'for example: https://www.bluemd.me'}/>
                  </Form.Item>
                </>
              }
            </>
          }
        </Form.Item>
      </Form>
      {state.error &&
        <Alert message={state.error} type={'error'} className={'mt-4'}/>
      }
    </Modal>
  )
})
