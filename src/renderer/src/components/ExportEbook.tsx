import {observer} from 'mobx-react-lite'
import {Alert, Button, Form, Input, Modal, Radio} from 'antd'
import {configStore} from '../store/config'
import {ReadOutlined} from '@ant-design/icons'
import {useLocalState} from '../hooks/useLocalState'
import AceEditor from 'react-ace'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/theme-cloud9_night'
import {exportEbookHtml} from '../editor/output/html'
import {db, Ebook} from '../store/db'
import {treeStore} from '../store/tree'
import {useCallback, useEffect} from 'react'
import {message$} from '../utils'

export function AceCode(props: {
  value?: string
  onChange?: (v: string) => void
}) {
  return (
    <div className={'pt-2'}>
      <AceEditor
        mode={'json'}
        setOptions={{
          showGutter: false,
          highlightActiveLine: false,
          useWorker: false
        }}
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

export const ExportEbook = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    addOpen: false,
    exporting: false,
    selectRecord: undefined as Ebook | undefined,
    records: [] as Ebook[]
  })
  const getEbook = useCallback(() => {
    db.ebook.where('filePath').equals(treeStore.root?.filePath).toArray().then(res => {
      setState({records: res})
    })
  }, [])
  useEffect(() => {
    window.electron.ipcRenderer.on('export-ebook', () => {
      if (treeStore.root) {
        setState({open: true})
        getEbook()
      } else {
        message$.next({
          type: 'info',
          content: configStore.isZh ? '导出电子书需要打开任意文件夹' : 'Exporting an eBook requires opening any folder'
        })
      }
    })
  }, [])
  return (
    <Modal
      width={700}
      open={state.open}
      onCancel={() => setState({open: false})}
      title={configStore.isZh ? '导出电子书为HTML' : 'Export eBook to html'}
      footer={null}
    >
      <Alert message={configStore.isZh ? '当前文件夹中的导出记录' : 'The exported record in the current folder'} type="info" />
      <div className={'divide-y divide-gray-700 my-2'}>
        {state.records.map(r =>
          <div className={'flex py-4'} key={r.id}>
            <div className={'flex-1 flex items-center'}>
              <ReadOutlined />
              <span className={'ml-3 break-all'}>{r.name}</span>
            </div>
            <div className={'flex-shrink-0 ml-3'}>
              <Button
                size={'small'} type={'link'}
                disabled={state.exporting}
                onClick={() => {
                  setState({exporting: true})
                  exportEbookHtml(r).finally(() => setState({exporting: false}))
                }}
              >
                {configStore.isZh ? '导出' : 'Export'}
              </Button>
              <Button
                size={'small'} type={'link'}
                onClick={() => {
                  setState({selectRecord: r, addOpen: true})
                }}
              >
                {configStore.isZh ? '编辑' : 'Edit'}
              </Button>
              <Button
                size={'small'} type={'link'} danger={true}
                onClick={() => {
                  db.ebook.delete(r.id!)
                  getEbook()
                }}
              >
                {configStore.isZh ? '删除' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </div>
      <Button
        type={'primary'} block={true} className={'mt-4'}
        onClick={() => setState({addOpen: true, selectRecord: undefined})}
      >
        {configStore.isZh ? '添加导出' : 'Add Export'}
      </Button>
      <Add
        open={state.addOpen}
        onClose={() => {
          getEbook()
          setState({addOpen: false})
        }}
        record={state.selectRecord}
      />
    </Modal>
  )
})

const Add = observer((props: {
  onClose: () => void
  open: boolean,
  record?: Ebook
}) => {
  const [form] = Form.useForm()
  const [state, setState] = useLocalState({
    loading: false
  })
  useEffect(() => {
    if (props.record) {
      form.setFieldsValue(props.record)
    } else {
      form.resetFields()
    }
  }, [props.open])
  return (
    <Modal
      title={configStore.isZh ? '添加导出' : 'Add Export'}
      width={700} open={props.open}
      onCancel={props.onClose}
      confirmLoading={state.loading}
      onOk={() => {
        form.validateFields().then(v => {
          setState({loading: true})
          exportEbookHtml(v).then(() => {
            if (props.record) {
              db.ebook.update(props.record.id!, {
                ...v
              })
            } else {
              db.ebook.add({
                filePath: treeStore.root.filePath!,
                ...v
              })
            }
            props.onClose()
          }).finally(() => setState({loading: false}))
        })
      }}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}}>
        <Form.Item label={configStore.isZh ? '名称' : 'Name'} name={'name'} rules={[{required: true}]}>
          <Input/>
        </Form.Item>
        <Form.Item label={configStore.isZh ? '导出策略' : 'export policy'} name={'strategy'} initialValue={'auto'} rules={[{required: true}]}>
          <Radio.Group>
            <Radio.Button value={'auto'}>{configStore.isZh ? '根据文件目录自动同步' : 'Automatic export on this directory'}</Radio.Button>
            <Radio.Button value={'custom'}>{configStore.isZh ? '自定义章节' : 'Custom chapters'}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle={true}
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
                    {name: "folderName", folder: true, children: [{name: "docName", path: "folderName/fileName"}]}
                  ], null, 2)}
                >
                  <AceCode/>
                </Form.Item>
              }
            </>
          }
        </Form.Item>
      </Form>
    </Modal>
  )
})
