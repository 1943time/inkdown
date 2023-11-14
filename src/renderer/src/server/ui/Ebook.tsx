import {observer} from 'mobx-react-lite'
import {Form, Input, Modal, Radio} from 'antd'
import {useEffect} from 'react'
import {IBook} from '../model'
import {shareStore} from '../store'
import {useLocalState} from '../../hooks/useLocalState'
import {stat} from '../../utils'
import {AceCode} from '../../components/AceCode'

export const EBook = observer((props: {
  open: boolean
  onClose: () => void
  selectBook?: IBook
  onSave: (data: IBook) => void
  defaultRootPath?: string
}) => {
  const [state, setState] = useLocalState({
    submitting: false,
    config: {} as any
  })
  const [form] = Form.useForm()

  useEffect(() => {
    if (props.open) {
      form.resetFields()
      if (!props.selectBook) {
        form.setFieldsValue({
          filePath: props.defaultRootPath
        })
      } else {
        form.setFieldsValue({
          path: props.selectBook.path,
          name: props.selectBook.name,
          filePath: props.selectBook.filePath,
          strategy: props.selectBook.config.strategy,
          ignorePaths: props.selectBook.config.ignorePaths,
          chapters: props.selectBook.config.chapters ? JSON.stringify(props.selectBook.config.chapters, null, 2) : undefined
        })
      }
    }
  }, [props.open, props.selectBook])
  return (
    <Modal
      title={(
        <div>
          <span>Share Book</span>
          <a className={'link text-sm font-normal ml-2'} target={'_blank'}>view guide</a>
        </div>
      )}
      width={700}
      onCancel={props.onClose}
      open={props.open}
      okText={'Save and Share'}
      confirmLoading={state.submitting}
      onOk={() => {
        form.validateFields().then(async v => {
          setState({submitting: true})
          try {
            const res = await shareStore.shareBook({
              id: props.selectBook?.id,
              name: v.name,
              path: v.path,
              filePath: v.filePath,
              config: {
                ignorePaths: v.ignorePaths,
                strategy: v.strategy,
                chapters: v.chapters ? JSON.parse(v.chapters) : undefined
              }
            })
            if (res) {
              props.onSave(res)
              props.onClose()
            }
          } finally {
            setState({submitting: false})
          }
        })
      }}
    >
      <Form form={form} layout={'horizontal'} labelCol={{span: 5}} className={'mt-6'}>
        <Form.Item
          label={'Book Id'} name={'path'}
          tooltip={'Unique identifier, which determines the url access path of the shared book'}
          rules={[
            {
              required: true,
              validator: (rule, value: string) => {
                if (value.startsWith('-') || value.endsWith('-')) return Promise.reject('Cannot begin or end with a - dash')
                if (!(/^[\da-zA-Z\-]+$/.test(value))) return Promise.reject('Composition of uppercase and lowercase letters, numbers and - characters')
                return Promise.resolve()
              }
            },
            {
              validator: async (rule, value) => {
                if (props.selectBook && props.selectBook.path === value) return Promise.resolve()
                const res = await shareStore.api.checkBookPath(value)
                return res.exist ? Promise.reject('The book id already exists') : Promise.resolve()
              },
              validateTrigger: 'submit'
            }
          ]}>
          <Input
            placeholder={'Composition of uppercase and lowercase letters, numbers and - characters'}
          />
        </Form.Item>
        <Form.Item
          label={'Book name'} name={'name'}
          rules={[{required: true}]}
        >
          <Input maxLength={50} placeholder={'Enter book title'}/>
        </Form.Item>
        <Form.Item
          label={'Book root path'}
          name={'filePath'}
          tooltip={'Content extraction root directory'}
          rules={[
            {required: true, message: 'Please enter the path of the folder to be synchronized'},
            {
              validator: (rule, value) => {
                if (!stat(value)?.isDirectory()) {
                  return Promise.reject(`${value} is an incorrect file path`)
                }
                return Promise.resolve()
              },
              validateTrigger: 'submit'
            }
          ]}
        >
          <Input maxLength={50} placeholder={'Enter book root path'}/>
        </Form.Item>
        <Form.Item
          label={'Strategy'} name={'strategy'}
          initialValue={'auto'} rules={[{required: true}]}
          tooltip={'Automatically generate according to the current file directory or manually define the chapter structure'}
        >
          <Radio.Group>
            <Radio.Button value={'auto'}>{'based on directories'}</Radio.Button>
            <Radio.Button value={'custom'}>{'Custom chapters'}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle={true}
          shouldUpdate={(prevValues, nextValues) => prevValues.strategy !== nextValues.strategy}>
          {() =>
            <>
              {form.getFieldValue('strategy') === 'auto' &&
                <>
                  <Form.Item label={'Ignore folders'} name={'ignorePaths'}>
                    <Input placeholder={'Relative path for example: others/files multiple use, number split'}/>
                  </Form.Item>
                </>
              }
              {form.getFieldValue('strategy') === 'custom' &&
                <Form.Item
                  label={'Chapter definition'} name={'chapters'}
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
