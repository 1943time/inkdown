import {observer} from 'mobx-react-lite'
import {Button, Form, Input, Modal, Space} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {configStore} from '../../store/config'
import {FolderOpenOutlined} from '@ant-design/icons'
import {Subject} from 'rxjs'
import {useSubject} from '../../hooks/subscribe'
import {MainApi} from '../../api/main'
import {useCallback} from 'react'
import {db} from '../../store/db'
import {nid} from '../../utils'
import {treeStore} from '../../store/tree'

export const editSpace$ = new Subject<string | null>()
export const EditSpace = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    spaceId: ''
  })
  const [form] = Form.useForm()
  useSubject(editSpace$, (spaceId) => {
    form.resetFields()
    setState({open: true, spaceId: spaceId || ''})
  })
  const save = useCallback(() => {
    form.validateFields().then(async v => {
      if (state.spaceId) {
        const record = await db.space.get(state.spaceId)
        if (record?.name === v.name && record?.filePath === v.filePath) {
          setState({open: false})
        } else {
          await db.space.update(state.spaceId, {
            name: v.name,
            filePath: v.filePath
          })
        }
      } else {
        const exist = await db.space.filter(s => s.name === v.name || s.filePath === v.filePath).first()
        if (exist) {
          if (exist.name === v.name) {
            form.setFields([{name: 'name', errors: ['Space name already exists'], validated: false}])
          }
          if (exist.filePath === v.filePath) {
            form.setFields([{name: 'filePath', errors: ['The folder is already used by another space'], validated: false}])
          }
        } else {
          const count = await db.space.count()
          const now = Date.now()
          const id = nid()
          await db.space.add({
            cid: id,
            name: v.name,
            filePath: v.filePath,
            sort: count,
            lastOpenTime: now,
            created: now
          })
          setState({open: false})
          console.log('start')
          treeStore.initial(id)
        }
      }
    })
  }, [])
  return (
    <Modal
      width={420}
      open={state.open}
      title={configStore.zh ? '创建文档空间' : 'Create doc space'}
      closable={false}
      footer={null}
    >
      <Form
        layout={'vertical'}
        form={form}
      >
        <Form.Item
          label={configStore.zh ? '空间名称' : 'Space name'}
          rules={[{required: true}]}
          name={'name'}
        >
          <Input placeholder={configStore.zh ? '输入名称' : 'Enter Name'}/>
        </Form.Item>
        <Form.Item
          label={configStore.zh ? '文件夹' : 'Folder'}
        >
          <Space.Compact className={'w-full'}>
            <Form.Item
              rules={[{required: true}]}
              name={'filePath'}
              noStyle={true}
            >
              <Input disabled={true} placeholder={configStore.zh ? '请选择文件夹' : 'Select a folder'}/>
            </Form.Item>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => {
                MainApi.openFolder().then(res => {
                  if (res.filePaths?.length) {
                    form.setFieldValue('filePath', res.filePaths[0])
                  }
                })
              }}
            >
              Open
            </Button>
          </Space.Compact>
        </Form.Item>
        <div className={'flex'}>
          <Button className={'flex-1'} onClick={() => setState({open: false})}>Cancel</Button>
          <Button type={'primary'} className={'flex-1 ml-4'} onClick={save}>Save</Button>
        </div>
      </Form>
    </Modal>
  )
})
