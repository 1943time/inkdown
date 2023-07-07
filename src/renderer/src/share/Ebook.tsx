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
import {configStore} from '../store/config'

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
      title={configStore.isZh ? '电子书' : 'eBook'}
      width={800}
      onCancel={props.onClose}
      open={props.open}
      confirmLoading={state.submitting}
      footer={(
        <div>
          <Button onClick={props.onClose}>
            {configStore.isZh ? 'cancel' : '取消'}
          </Button>
          {props.id &&
            <Button
              danger={true}
              onClick={() => {
                modal.confirm({
                  title: configStore.isZh ? '提示' : 'Prompt',
                  content: configStore.isZh ? '点击确定删除该电子书，删除后不可浏览' : 'Click OK to delete the e-book, which cannot be browsed after deletion',
                  onOk: async () => {
                    await removeBook(props.id!)
                    message$.next({type: 'success', content: configStore.isZh ? '删除成功' : 'The deletion was successful'})
                    props.onClose()
                  }
                })
              }}
            >
              {configStore.isZh ? '删除' : 'Delete'}
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
                    let msg = ''
                    if (configStore.isZh) {
                      msg = exist.path === v.path ? '访问路径已存在' : '电子书名称已存在'
                    } else {
                      msg = exist.path === v.path ? 'The access path already exists' : 'The eBook name already exists'
                    }
                    return message$.next({
                      type: 'info',
                      content: msg
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
                    content: configStore.isZh ? '同步失败' : 'Synchronization failed'
                  })
                })
                setState({submitting: false})
              })
            }}
          >
            {props.id ? (configStore.isZh ? '同步' : 'synchronous') : (configStore.isZh ? '添加' : 'Create')}
          </Button>
        </div>
      )}
    >
      {modalCtx}
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}}>
        <Form.Item label={configStore.isZh ? '电子书名称' : 'The name of the e-book'} name={'name'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
        <Form.Item
          label={configStore.isZh ? '访问路径' : 'Url Path'} name={'path'}
           rules={[{required: true, pattern: /^[a-zA-Z\d]+$/, message: configStore.isZh ? '由大小写英文字母数字组成' : 'Consists of uppercase and lowercase English alphanumeric numbers'}]}>
          <Input placeholder={configStore.isZh ? '由大小写英文字母数字组成' : 'Consists of uppercase and lowercase English alphanumeric numbers'}/>
        </Form.Item>
        <Form.Item label={configStore.isZh ? '同步策略' : 'Synchronization policy'} name={'strategy'} initialValue={'auto'} rules={[{required: true}]}>
          <Radio.Group>
            <Radio.Button value={'auto'}>{configStore.isZh ? '根据文件目录自动同步' : 'Automatic synchronization based on file directories'}</Radio.Button>
            <Radio.Button value={'custom'}>{configStore.isZh ? '自定义章节' : 'Custom chapters'}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item noStyle={true}
                   shouldUpdate={(prevValues, nextValues) => prevValues.strategy !== nextValues.strategy}>
          {() =>
            <>
              {form.getFieldValue('strategy') === 'auto' &&
                <>
                  <Form.Item label={configStore.isZh ? '过滤文件夹' : 'Filter folders'} name={'ignorePaths'}>
                    <Input placeholder={configStore.isZh ? '例如: others/files 多个用,号分割' : 'For example: others/files Multiple uses, number splitting'}/>
                  </Form.Item>
                </>
              }
              {form.getFieldValue('strategy') === 'custom' &&
                <Form.Item
                  label={configStore.isZh ? '目录定义' : 'Directory definition'} name={'map'}
                  rules={[
                    {required: true, validator: (rule, value, callback) => {
                      try {
                        if (!(JSON.parse(value) instanceof Array)) {
                          return Promise.reject(configStore.isZh ? 'JSON格式不正确' : 'The JSON format is incorrect')
                        }
                      } catch (e) {
                        return Promise.reject(configStore.isZh ? 'JSON格式不正确' : 'The JSON format is incorrect')
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
