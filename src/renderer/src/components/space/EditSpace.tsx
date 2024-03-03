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
import {Icon} from '@iconify/react'
import {openConfirmDialog$} from '../Dialog/ConfirmDialog'
import {runInAction} from 'mobx'

export const editSpace$ = new Subject<string | null>()

export const spaceChange$ = new Subject()

export const EditSpace = observer(() => {
  const [state, setState] = useLocalState({
    open: false,
    spaceId: '',
    spaceName: ''
  })

  const [form] = Form.useForm()
  useSubject(editSpace$, (spaceId) => {
    form.resetFields()
    if (spaceId) {
      db.space.get(spaceId).then(res => {
        if (res) {
          form.setFieldsValue({
            name: res.name,
            filePath: res.filePath
          })
          setState({spaceName: res.name, spaceId, open: true})
        }
      })
    } else {
      setState({open: true, spaceId: '', spaceName: ''})
    }
  })

  const validate = useCallback(async (filePath: string, spaceId?: string) => {
    const includeSpace = await db.space.filter(s => filePath.startsWith(s.filePath)).first()
    if (includeSpace && (!spaceId || includeSpace.cid !== spaceId)) {
      form.setFields([{name: 'filePath', errors: ['The folder is already included in another space'], validated: false}])
      return false
    }
    return true
  }, [])

  const save = useCallback(() => {
    form.validateFields().then(async v => {
      if (state.spaceId) {
        const record = await db.space.get(state.spaceId)
        if (record?.name === v.name && record?.filePath === v.filePath) {
          setState({open: false})
        } else {
          if (!await validate(v.filePath, state.spaceId)) return
          await db.space.update(state.spaceId, {
            name: v.name,
            filePath: v.filePath
          })
          if (state.spaceId === treeStore.root?.cid) {
            runInAction(() => {
              treeStore.root!.filePath = v.filePath
              treeStore.root!.name = v.name
            })
          }
          setState({open: false})
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
          if (!await validate(v.filePath)) return
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
          treeStore.initial(id)
          spaceChange$.next(null)
        }
      }
    })
  }, [])
  return (
    <Modal
      width={420}
      open={state.open}
      title={(
        <div className={'flex items-center'}>
          <Icon icon={'material-symbols:workspaces-outline'} className={'mr-1'}/>
          {state.spaceId ? state.spaceName : configStore.zh ? '创建文档空间' : 'Create doc space'}
        </div>
      )}
      onCancel={() => setState({open: false})}
      footer={null}
    >
      <Form
        layout={'vertical'}
        className={'pt-2'}
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
        <div className={'space-y-3'}>
          <Button block={true} type={'primary'} onClick={save}>{state.spaceId ? configStore.zh ? '保存' : 'Save' : configStore.zh ? '创建' : 'Create'}</Button>
          {!!state.spaceId &&
            <Button
              block={true} danger={true}
              onClick={() => {
                openConfirmDialog$.next({
                  title: 'Do you want to delete this space?',
                  description: 'Deleting space does not delete real files.',
                  okText: 'Delete',
                  onConfirm: async () => {
                    await db.file.where('spaceId').equals(state.spaceId).delete()
                    await db.recent.where('spaceId').equals(state.spaceId).delete()
                    await db.history.where('spaceId').equals(state.spaceId).delete()
                    await db.space.delete(state.spaceId)
                    const space = await db.space.reverse().first()
                    if (space) {
                      treeStore.initial(space.cid)
                    } else {
                      runInAction(() => {
                        treeStore.root = null
                        treeStore.nodeMap.clear()
                        treeStore.tabs = [treeStore.createTab()]
                      })
                    }
                    spaceChange$.next(null)
                    setState({open: false})
                  }
                })
              }}
            >
              Delete
            </Button>
          }
        </div>
      </Form>
    </Modal>
  )
})
