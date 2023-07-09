import {observer} from 'mobx-react-lite'
import {Form, Input, Modal, Select} from 'antd'
import {message$} from '../utils'
import {useLocalState} from '../hooks/useLocalState'
import {useEffect} from 'react'
import {MainApi} from '../api/main'
import {db} from './db'
import {configStore} from '../store/config'
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
      title={configStore.isZh ? '设置分享服务' : 'Set up sharing service'}
      width={600}
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={state.submitting}
      okText={state.submitting ? (configStore.isZh ? '正在初始化' : 'Initializing') : configStore.isZh ? '确定' : 'Confirm'}
      onOk={() => {
        return form.validateFields().then(async v => {
          setState({submitting: true})
          try {
            v.domain = v.domain?.replace(/\/+$/, '')
            v.target = v.target?.replace(/\/+$/, '')
            await window.electron.ipcRenderer.invoke('saveServerConfig', v)
            const sdk = new window.api.sdk()
            await sdk.connect()
            await sdk.initial()
            sdk.dispose()
            message$.next({
              type: 'success',
              content: configStore.isZh ? '服务初始化成功' : 'Service initialization succeeded'
            })
            await db.doc.clear()
            await db.file.clear()
            await db.chapter.clear()
            configStore.syncConfig()
            await db.chapter.filter(o => true).modify({
              hash: ''
            })
            props.onClose()
          } catch (e) {
            console.error('e', e)
            await window.electron.ipcRenderer.invoke('removeServerConfig')
            message$.next({
              type: 'warning',
              content: configStore.isZh ? '服务链接失败，请确认参数填写正确' : 'The service link fails, please confirm that the parameters are correct'
            })
          } finally {
            setState({submitting: false})
          }
        })
      }}
    >
      <Form layout={'horizontal'} labelCol={{span: 7}} form={form}>
        <Form.Item label={configStore.isZh ? '服务类型' : 'Service type'} rules={[{required: true}]} name={'server'} initialValue={'ssh'}>
          <Select
            options={[
              {label: configStore.isZh ? 'Linux服务器' : 'Linux server', value: 'ssh'},
              {label: configStore.isZh ? '阿里云' : 'Ali cloud', value: 'ali'}
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
                  <Form.Item label={'ssh username'} name={'username'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'ssh password'} name={'password'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={configStore.isZh ? '存储路径' : 'Storage path'} name={'target'} rules={[{required: true}]}>
                    <Input/>
                  </Form.Item>
                  <Form.Item label={'port'} name={'port'}>
                    <Input placeholder={configStore.isZh ? '选填' : 'Optional'}/>
                  </Form.Item>
                </>
              }
            </>
          }
        </Form.Item>
        <Form.Item label={configStore.isZh ? '绑定域名' : 'Bind a domain name'} name={'domain'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
      </Form>
    </Modal>
  )
})
