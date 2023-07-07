import {observer} from 'mobx-react-lite'
import {Button, Form, Input, Modal, Radio} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {Sync} from './sync'
import {useEffect} from 'react'
import {db} from './db'
import {message$} from '../utils'
import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-cloud9_night'
import {removeBook} from './Record'

function Code(props: {
  value?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className={'pt-2'}>
      <AceEditor
        ref={editor => {
          editor?.editor.renderer.setOption('showGutter', false)
          editor?.editor.setHighlightActiveLine(false)
        }}
        mode={'json'}
        theme="cloud9_night"
        height={'400px'}
        width={'100%'}
        tabSize={2}
        value={props.value}
        onChange={props.onChange}
        editorProps={{ $blockScrolling: true}}
      />
    </div>
  )
}
export const Ebook = observer((props: {
  open: boolean
  onClose: () => void
  id?: number
}) => {
  const [state, setState] = useLocalState({
    submitting: false
  })
  const [modal, modalCtx] = Modal.useModal()
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
      onCancel={props.onClose}
      open={props.open}
      confirmLoading={state.submitting}
      footer={(
        <div>
          <Button onClick={props.onClose}>
            取消
          </Button>
          {props.id &&
            <Button
              danger={true}
              onClick={() => {
                modal.confirm({
                  title: '提示',
                  content: '点击确定删除该电子书，删除后不可浏览',
                  onOk: async () => {
                    await removeBook(props.id!)
                    message$.next({type: 'success', content: '删除成功'})
                    props.onClose()
                  }
                })
              }}
            >
              删除
            </Button>
          }
          <Button
            type={'primary'}
            loading={state.submitting}
            onClick={() => {
              form.validateFields().then(async v => {
                if (!props.id) {
                  const exist = await db.book.filter(obj => obj.path === v.path || obj.name === v.name).first()
                  if (exist) {
                    return message$.next({
                      type: 'info',
                      content: exist.path === v.path ? '访问路径已存在' : '电子书名称已存在'
                    })
                  }
                }
                const sync = new Sync()
                setState({submitting: true})
                await sync.syncEbook({
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
                })
                setState({submitting: false})
              })
            }}
          >
            {props.id ? '同步' : '添加'}
          </Button>
        </div>
      )}
    >
      {modalCtx}
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}}>
        <Form.Item label={'电子书名称'} name={'name'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
        <Form.Item label={'访问路径'} name={'path'}
                   rules={[{required: true, pattern: /^[a-zA-Z\d]+$/, message: '由大小写英文字母数字组成'}]}>
          <Input/>
        </Form.Item>
        <Form.Item label={'同步策略'} name={'strategy'} initialValue={'auto'} rules={[{required: true}]}>
          <Radio.Group>
            <Radio.Button value={'auto'}>文件目录自动同步</Radio.Button>
            <Radio.Button value={'custom'}>自定义章节</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle={true}
                   shouldUpdate={(prevValues, nextValues) => prevValues.strategy !== nextValues.strategy}>
          {() =>
            <>
              {form.getFieldValue('strategy') === 'auto' &&
                <>
                  <Form.Item label={'过滤文件夹'} name={'ignorePaths'}>
                    <Input placeholder={'例如: others/files 多个用,号分割'}/>
                  </Form.Item>
                </>
              }
              {form.getFieldValue('strategy') === 'custom' &&
                <Form.Item
                  label={'目录定义'} name={'map'}
                  rules={[
                    {required: true, validator: (rule, value, callback) => {
                      try {
                        if (!(JSON.parse(value) instanceof Array)) {
                          return Promise.reject('JSON格式不正确')
                        }
                      } catch (e) {
                        return Promise.reject('JSON格式不正确')
                      }
                      return Promise.resolve()
                    }}
                  ]}
                  initialValue={JSON.stringify([
                    {name: "folderName", folder: true, children: [{name: "docName", path: "docPath"}]}
                  ], null, 2)}
                >
                  <Code/>
                </Form.Item>
              }
            </>
          }
        </Form.Item>
      </Form>
    </Modal>
  )
})
