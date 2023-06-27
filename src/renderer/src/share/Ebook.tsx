import {observer} from 'mobx-react-lite'
import {Form, Input, message, Modal, Radio} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {Sync} from './sync'
import {useEffect} from 'react'
import {db} from './db'
import {message$} from '../utils'

export const Ebook = observer((props: {
  open: boolean
  onClose: () => void
  id?: number
}) => {
  const [state, setState] = useLocalState({
    submitting: false
  })
  const [form] = Form.useForm()
  useEffect(() => {
    if (props.open) {
      if (props.id) {
        db.book.get(props.id).then(res => {
          if (res) form.setFieldsValue(res)
        })
      } else {
        form.resetFields()
      }
    }
  }, [props.open])
  return (
    <Modal
      title={'电子书'}
      width={800}
      open={props.open}
      onCancel={props.onClose}
      confirmLoading={state.submitting}
      onOk={() => {
        form.validateFields().then(v => {
          const sync = new Sync()
          setState({submitting: true})
          sync.syncEbook({
            ...v,
            id: props.id
          }).then(() => {
            console.log('success')
          }).catch(e => {
            console.error(e)
            message$.next({
              type: 'error',
              content: '同步失败'
            })
          }).finally(() => setState({submitting: false}))
        })
      }}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}}>
        <Form.Item label={'电子书名称'} name={'name'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
        <Form.Item label={'访问路径'} name={'path'} rules={[{required: true, pattern: /^[a-zA-Z\d]+$/, message: '由大小写英文字母数字组成'}]}>
          <Input/>
        </Form.Item>
        <Form.Item label={'同步策略'} name={'strategy'} initialValue={'auto'} rules={[{required: true}]}>
          <Radio.Group>
            <Radio.Button value={'auto'}>文件目录自动同步</Radio.Button>
            <Radio.Button value={'custom'}>自定义章节</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle={true} shouldUpdate={(prevValues, nextValues) => prevValues.strategy !== nextValues.strategy}>
          {() =>
            <>
            {form.getFieldValue('strategy') === 'auto' &&
              <>
                <Form.Item label={'过滤文件夹'} name={'ignorePaths'}>
                  <Input placeholder={'例如: others/files 多个用,号分割'}/>
                </Form.Item>
              </>
            }
            </>
          }
        </Form.Item>
      </Form>
    </Modal>
  )
})
