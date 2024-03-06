import {observer} from 'mobx-react-lite'
import {Button, Form, Input, Modal, Space, Spin} from 'antd'
import {useCallback, useEffect} from 'react'
import {IBook} from '../model'
import {shareStore} from '../store'
import {useLocalState} from '../../hooks/useLocalState'
import {openDialog} from '../../api/main'
import {shareSuccessfully$} from './Successfully'
import {Subject} from 'rxjs'
import {useSubject} from '../../hooks/subscribe'
import {treeStore} from '../../store/tree'
import {db} from '../../store/db'
import {message$} from '../../utils'
import {IFileItem, ISpaceNode} from '../../index'

export const openEbook$ = new Subject<{
  folderPath: string
}>()

export const EBook = observer((props: {
  onSave: (data: IBook) => void
  onClose?: () => void
  defaultRootPath?: string
}) => {
  const [state, setState] = useLocalState({
    submitting: false,
    config: {} as any,
    book: null as null | IBook,
    loading: false,
    open: false
  })
  const [form] = Form.useForm()
  useSubject(openEbook$, v => {
    setState({open: true})
    setTimeout(() => {
      form.resetFields()
    })
    setState({book: null})
    if (v.folderPath) {
      setState({loading: true})
      shareStore.api.findBookByFilepath(v.folderPath).then(res => {
        if (!res.book) {
          form.setFieldsValue({
            filePath: v.folderPath
          })
        } else {
          setState({book: res.book})
          form.setFieldsValue({
            path: res.book.path,
            name: res.book.name,
            filePath: res.book.filePath
          })
        }
      }).finally(() => setState({loading: false}))
    }
  })
  const close = useCallback(() => {
    props.onClose?.()
    setState({open: false})
  }, [])

  return (
    <Modal
      title={'Share Folder'}
      width={600}
      onCancel={close}
      open={state.open}
      zIndex={2100}
      okText={'Save and Share'}
      cancelText={'Cancel'}
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
              filePath: v.filePath
            })
            if (res === null) {
              return message$.next({
                type: 'warning',
                content: 'The file node does not exist.'
              })
            }
            if (state.book?.id && state.book.filePath !==  v.filePath) {
              shareStore.bookMap.delete(oldFilePath!)
            }
            if (res) {
              props.onSave(res.book)
              shareSuccessfully$.next(`${shareStore.serviceConfig!.domain}/book/${res.book.path}`)
              close()
            }
          } finally {
            setState({submitting: false, open: false})
          }
        })
      }}
    >
      {state.loading &&
        <div className={'absolute inset-0 z-10 bg-white/30 flex items-center justify-center'}>
          <Spin/>
        </div>
      }
      <Form form={form} layout={'horizontal'} labelCol={{span: 6}} className={'mt-6'}>
        <Form.Item
          label={'Book Id'} name={'path'}
          tooltip={'Unique identifier, which determines the url access path of the shared book'}
          rules={[
            {
              required: true,
              validator: (rule, value: string) => {
                if (!value) return Promise.reject('Please enter bookId')
                if (value.startsWith('-') || value.endsWith('-')) return Promise.reject('Cannot begin or end with a - dash')
                if (!(/^[\da-zA-Z\-]+$/.test(value))) return Promise.reject( 'Composition of uppercase and lowercase letters, numbers and - characters')
                return Promise.resolve()
              }
            },
            {
              validator: async (rule, value) => {
                if (state.book && state.book.path === value) return Promise.resolve()
                const res = await shareStore.api.checkBookPath(value)
                return res.book ? Promise.reject('The book id already exists') : Promise.resolve()
              },
              validateTrigger: 'submit'
            }
          ]}>
          <Input
            disabled={!!state.book}
            placeholder={'Book Id'}
          />
        </Form.Item>
        <Form.Item
          label={'Book name'} name={'name'}
          rules={[{required: true}]}
        >
          <Input maxLength={50} placeholder={'Book name'}/>
        </Form.Item>
        <Form.Item
          required={true}
          label={'Book root path'}
          tooltip={'Content extraction root directory'}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              noStyle={true}
              name={'filePath'}
              rules={[
                {required: true, message: 'Please enter the path of the folder to be synchronized'},
                {
                  validator: (rule, value: string) => {
                    if (!value?.startsWith(treeStore.root!.filePath)) {
                      return Promise.reject(`The folder needs to be within the space`)
                    }
                    return Promise.resolve()
                  },
                  validateTrigger: 'submit'
                }
              ]}
            >
              <Input maxLength={50} placeholder={'Select folder path'} disabled={true}/>
            </Form.Item>
            <Button
              onClick={() => {
                openDialog({
                  title: 'Select Folder',
                  message: 'Select the folder you want to share',
                  properties: ['openDirectory']
                }).then(res => {
                  if (res.filePaths.length) {
                    form.setFieldValue('filePath', res.filePaths[0])
                  }
                })
              }}
            >
              {'Select'}
            </Button>
          </Space.Compact>
        </Form.Item>
      </Form>
    </Modal>
  )
})
