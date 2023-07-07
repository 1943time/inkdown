import {observer} from 'mobx-react-lite'
import {Form, Input, Modal, Select} from 'antd'
import {message$} from '../utils'
import {useLocalState} from '../hooks/useLocalState'
import {useEffect} from 'react'
import {MainApi} from '../api/main'
import {db} from './db'
export const ServerSet = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [form] = Form.useForm()
  const [state, setState] = useLocalState({
    submitting: false
  })
  useEffect(() => {
    if (props.open) {
      MainApi.getServerConfig().then(res => {
        if (res) {
          form.setFieldsValue(res)
        } else{
          form.resetFields()
        }
      })
    }
  }, [props.open])
  return (
    <Modal
      title={'设置分享服务'}
      width={600}
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={state.submitting}
      okText={state.submitting ? '正在初始化' : '确定'}
      onOk={() => {
        return form.validateFields().then(async v => {
          setState({submitting: true})
          try {
            v.domain = v.domain?.replace(/\/+$/, '')
            v.target = v.target?.replace(/\/+$/, '')
            await window.electron.ipcRenderer.invoke('saveServerConfig', v)
            const sdk = new window.api.sdk()
            await sdk.connect()
            await sdk.reset()
            sdk.dispose()
            message$.next({
              type: 'success',
              content: '服务初始化成功'
            })
            await db.doc.clear()
            await db.file.clear()
            await db.chapter.filter(o => true).modify({
              hash: ''
            })
            props.onClose()
          } catch (e) {
            console.error('e', e)
            await window.electron.ipcRenderer.invoke('removeServerConfig')
            message$.next({
              type: 'warning',
              content: '服务链接失败，请确认参数填写正确'
            })
          } finally {
            setState({submitting: false})
          }
        })
      }}
    >
      <Form layout={'horizontal'} labelCol={{span: 6}} form={form}>
        <Form.Item label={'服务类型'} rules={[{required: true}]} name={'server'} initialValue={'ali'}>
          <Select
            options={[
              {label: '阿里云', value: 'ali'},
              {label: 'Linux服务', value: 'ssh'}
            ]}
          />
        </Form.Item>
        <Form.Item shouldUpdate={(prevValues, nextValues) => prevValues.server !== nextValues.server} noStyle={true}>
          {() =>
            <>
              {form.getFieldValue('server') === 'ali' &&
                <>
                  <Form.Item
                    label={'AccessKeyId'}
                    rules={[{required: true}]}
                    name={'accessKeyId'}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'AccessKeySecret'} name={'accessKeySecret'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'region'} name={'region'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'bucket'} name={'bucket'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                </>
              }
              {form.getFieldValue('server') === 'ssh' &&
                <>
                  <Form.Item
                    label={'host'}
                    rules={[{required: true}]}
                    name={'host'}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'username'} name={'username'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'password'} name={'password'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'存储路径'} name={'target'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'port'} name={'port'}>
                    <Input placeholder={'选填'}/>
                  </Form.Item>
                </>
              }
            </>
          }
        </Form.Item>
        <Form.Item label={'绑定域名'} name={'domain'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
