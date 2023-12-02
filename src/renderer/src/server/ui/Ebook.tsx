import {observer} from 'mobx-react-lite'
import {Button, Form, Input, Modal, Radio, Space, Spin} from 'antd'
import {useEffect} from 'react'
import {IBook} from '../model'
import {shareStore} from '../store'
import {useLocalState} from '../../hooks/useLocalState'
import {stat} from '../../utils'
import {AceCode} from '../../components/AceCode'
import {MainApi, openDialog} from '../../api/main'
import {shareSuccessfully$} from './Successfully'
import {configStore} from '../../store/config'

export const EBook = observer((props: {
  open: boolean
  onClose: () => void
  onSave: (data: IBook) => void
  defaultRootPath?: string
}) => {
  const [state, setState] = useLocalState({
    submitting: false,
    config: {} as any,
    book: null as null | IBook,
    loading: false,
    edit: false
  })
  const [form] = Form.useForm()

  useEffect(() => {
    if (props.open) {
      form.resetFields()
      setState({book: null, edit: false})
      if (props.defaultRootPath) {
        setState({loading: true})
        shareStore.api.findBookByFilepath(props.defaultRootPath).then(res => {
          if (!res.book) {
            form.setFieldsValue({
              filePath: props.defaultRootPath,
              strategy: 'auto'
            })
            setState({edit: false})
          } else {
            setState({book: res.book})
            form.setFieldsValue({
              path: res.book.path,
              name: res.book.name,
              filePath: res.book.filePath,
              strategy: res.book.config.strategy,
              ignorePaths: res.book.config.ignorePaths,
              chapters: res.book.config.chapters ? JSON.stringify(res.book.config.chapters, null, 2) : undefined
            })
            setState({edit: true})
          }
        }).finally(() => setState({loading: false}))
      }
    }
  }, [props.open, props.defaultRootPath])
  return (
    <Modal
      title={configStore.zh ? '分享文件夹' : 'Share Folder'}
      width={700}
      onCancel={props.onClose}
      open={props.open}
      okText={configStore.zh ? '保存并分享' : 'Save and Share'}
      cancelText={configStore.zh ? '取消' : 'Cancel'}
      confirmLoading={state.submitting}
      onOk={() => {
        form.validateFields().then(async v => {
          setState({submitting: true})
          try {
            const oldFilePath = state.book?.filePath
            const res = await shareStore.shareBook({
              id: state.book?.id,
              name: v.name,
              path: v.path,
              filePath: v.filePath,
              config: {
                ignorePaths: v.ignorePaths,
                strategy: v.strategy,
                chapters: v.chapters ? JSON.parse(v.chapters) : undefined
              }
            })
            if (state.book?.id && state.book.filePath !==  v.filePath) {
              shareStore.bookMap.delete(oldFilePath!)
            }
            if (res) {
              props.onSave(res.book)
              shareSuccessfully$.next(`${shareStore.serviceConfig!.domain}/book/${res.book.path}`)
              props.onClose()
            }
          } finally {
            setState({submitting: false})
          }
        })
      }}
    >
      {state.loading &&
        <div className={'absolute inset-0 z-10 bg-white/30 flex items-center justify-center'}>
          <Spin/>
        </div>
      }
      <Form form={form} layout={'horizontal'} labelCol={{span: 5}} className={'mt-6'}>
        <Form.Item
          label={'Book Id'} name={'path'}
          tooltip={configStore.zh ? '唯一标记，它决定分享文件夹的访问路径' : 'Unique identifier, which determines the url access path of the shared book'}
          rules={[
            {
              required: true,
              validator: (rule, value: string) => {
                if (value.startsWith('-') || value.endsWith('-')) return Promise.reject(configStore.zh ? '不能以-符号开头或结尾' : 'Cannot begin or end with a - dash')
                if (!(/^[\da-zA-Z\-]+$/.test(value))) return Promise.reject(configStore.zh ? '由大消息字母数字或-符号组成' : 'Composition of uppercase and lowercase letters, numbers and - characters')
                return Promise.resolve()
              }
            },
            {
              validator: async (rule, value) => {
                if (state.book && state.book.path === value) return Promise.resolve()
                const res = await shareStore.api.checkBookPath(value)
                return res.book ? Promise.reject(configStore.zh ? 'ID已存在' : 'The book id already exists') : Promise.resolve()
              },
              validateTrigger: 'submit'
            }
          ]}>
          <Input
            disabled={state.edit}
            placeholder={configStore.zh ? '大小写字母、数字和-字符的组合' : 'Composition of uppercase and lowercase letters, numbers and - characters'}
          />
        </Form.Item>
        <Form.Item
          label={configStore.zh ? '文档名称' : 'Book name'} name={'name'}
          rules={[{required: true}]}
        >
          <Input maxLength={50} placeholder={configStore.zh ? '输入文档名称' : 'Enter book title'}/>
        </Form.Item>
        <Form.Item
          label={configStore.zh ? '文件夹根路径' : 'Book root path'}
          tooltip={configStore.zh ? '内容提取根目录' : 'Content extraction root directory'}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              noStyle={true}
              name={'filePath'}
              rules={[
                {required: true, message: configStore.zh ? '请输入文件夹路径' : 'Please enter the path of the folder to be synchronized'},
                {
                  validator: (rule, value) => {
                    if (!stat(value)?.isDirectory()) {
                      return Promise.reject(`${value} is an incorrect folder path`)
                    }
                    return Promise.resolve()
                  },
                  validateTrigger: 'submit'
                }
              ]}
            >
              <Input maxLength={50} placeholder={configStore.zh ? '输入文件夹路径' : 'Enter book root path'}/>
            </Form.Item>
            <Button
              onClick={() => {
                openDialog({
                  title: 'Select Folder',
                  message: configStore.zh ? '选择想要分享的文件夹' : 'Select the folder you want to share',
                  properties: ['openDirectory']
                }).then(res => {
                  if (res.filePaths.length) {
                    form.setFieldValue('filePath', res.filePaths[0])
                  }
                })
              }}
            >
              {configStore.zh ? '选择' : 'Select'}
            </Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item
          label={configStore.zh ? '提取策略' : 'Strategy'} name={'strategy'}
          initialValue={'auto'} rules={[{required: true}]}
          tooltip={configStore.zh ? '根据当前文件目录自动生成或手动定义章节结构' : 'Automatically generate according to the current file directory or manually define the chapter structure'}
        >
          <Radio.Group>
            <Radio.Button value={'auto'}>{configStore.zh ? '根据目录生成' : 'Based on directories'}</Radio.Button>
            <Radio.Button value={'custom'}>{configStore.zh ? '自定义章节' : 'Custom chapters'}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle={true}
          shouldUpdate={(prevValues, nextValues) => prevValues.strategy !== nextValues.strategy}>
          {() =>
            <>
              {form.getFieldValue('strategy') === 'auto' &&
                <>
                  <Form.Item label={configStore.zh ? '忽略文件夹' : 'Ignore folders'} name={'ignorePaths'}>
                    <Input placeholder={configStore.zh ? '相对于跟路径，例如：other/files 多个使用,号分割' : 'Relative to the root path for example: others/files multiple use, number split'}/>
                  </Form.Item>
                </>
              }
              {form.getFieldValue('strategy') === 'custom' &&
                <Form.Item
                  label={configStore.zh ? '章节定义' : 'Chapter definition'} name={'chapters'}
                  rules={[
                    {
                      required: true, validator: (rule, value, callback) => {
                        try {
                          if (!(JSON.parse(value) instanceof Array)) {
                            return Promise.reject('The JSON format is incorrect')
                          }
                        } catch (e) {
                          return Promise.reject('The JSON format is incorrect')
                        }
                        return Promise.resolve()
                      }
                    }
                  ]}
                  initialValue={JSON.stringify([
                    {name: 'folderName', folder: true, children: [{name: 'docName', path: 'folderName/fileName'}]}
                  ], null, 2)}
                >
                  <AceCode
                    onChange={v => {
                      form.setFieldValue('map', v)
                    }}
                    mode={'json'}
                    value={JSON.stringify([
                      {name: 'folderName', folder: true, children: [{name: 'docName', path: 'folderName/fileName'}]}
                    ], null, 2)}
                  />
                </Form.Item>
              }
            </>
          }
        </Form.Item>
      </Form>
    </Modal>
  )
})
