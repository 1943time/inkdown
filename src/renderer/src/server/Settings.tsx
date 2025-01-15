import { Button, Form, Input } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { useCoreContext } from '../store/core'
export const Settings = observer(() => {
  const [form] = Form.useForm()
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    submitting: false,
    connected: false
  })
  const connect = useCallback(() => {
    form.validateFields().then(async (v) => {
      try {
        setState({ submitting: true })
        v.host = (v.host as string).replace(/\/*$/, '')
        await core.pb.connect(v)
      } catch (e: any) {
        core.message.error(
          e?.message || 'Connection failed, please check if the parameters are correct'
        )
      } finally {
        setState({ submitting: false })
      }
    })
  }, [])
  useEffect(() => {
    if (core.pb.host) {
      form.setFieldsValue({
        host: core.pb.host,
        access_key_id: core.pb.access_key_id,
        access_key_secret: core.pb.access_key_secret
      })
      setState({connected: true})
    }
  }, [])
  return (
    <div className={'flex justify-center'}>
      <Form labelCol={{ span: 7 }} className={'w-[500px]'} form={form}>
        <Form.Item
          label={'Host'}
          name={'host'}
          rules={[
            {
              required: true
            }
          ]}
        >
          <Input placeholder={'Contains the http prefix'} disabled={state.connected} />
        </Form.Item>
        <Form.Item
          label={'AccessKeyId'}
          name={'access_key_id'}
          rules={[
            {
              required: true
            }
          ]}
        >
          <Input disabled={state.connected} />
        </Form.Item>
        <Form.Item
          label={'AccessKeySecret'}
          name={'access_key_secret'}
          rules={[{ required: true }]}
        >
          <Input disabled={state.connected} />
        </Form.Item>
        <Form.Item label={' '} colon={false}>
          {!!core.pb.host ? (
            <Button
              danger={true}
              className={'w-36'}
              onClick={() => {
                form.resetFields()
                core.pb.reset()
                setState({connected: false})
              }}
            >
              Reset
            </Button>
          ) : (
            <Button
              type={'primary'}
              className={'w-36'}
              onClick={connect}
              loading={state.submitting}
            >
              Connect
            </Button>
          )}
        </Form.Item>
      </Form>
    </div>
  )
})
