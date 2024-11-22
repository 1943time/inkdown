import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Form, Input, Modal, Space} from 'antd'
import {useLocalState} from '../../hooks/useLocalState'
import {FolderOpenOutlined} from '@ant-design/icons'
import {Subject} from 'rxjs'
import {useSubject} from '../../hooks/subscribe'
import {MainApi} from '../../api/main'
import {useCallback} from 'react'
import {db} from '../../store/db'
import {nid} from '../../utils'
import {Icon} from '@iconify/react'
import {openConfirmDialog$} from '../Dialog/ConfirmDialog'
import {runInAction} from 'mobx'
import { useCoreContext } from '../../store/core'
import { useTranslation } from 'react-i18next'

export const editSpace$ = new Subject<string | null>()

export const spaceChange$ = new Subject()

export const EditSpace = observer(() => {
  const core = useCoreContext()
  const {t} = useTranslation()
  const [state, setState] = useLocalState({
    open: false,
    spaceId: '',
    spaceName: '',
    background: 'sky'
  })

  const [form] = Form.useForm()
  useSubject(editSpace$, (spaceId) => {
    if (spaceId) {
      db.space.get(spaceId).then(res => {
        if (res) {
          form.resetFields()
          form.setFieldsValue({
            name: res.name,
            filePath: res.filePath,
            imageFolder: res.imageFolder,
            relative: res.relative
          })
          setState({spaceName: res.name, spaceId, open: true, background: res.background || 'sky'})
        }
      })
    } else {
      setState({open: true, spaceId: '', spaceName: ''})
      form.resetFields()
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
        if (!(await validate(v.filePath, state.spaceId))) return
        await db.space.update(state.spaceId, {
          name: v.name,
          filePath: v.filePath,
          relative: v.relative,
          imageFolder: v.imageFolder,
          background: state.background
        })
        const oldPath = core.tree.root?.filePath
        if (state.spaceId === core.tree.root?.cid) {
          runInAction(() => {
            core.tree.root!.filePath = v.filePath
            core.tree.root!.name = v.name
            core.tree.root!.imageFolder = v.imageFolder
            core.tree.root!.relative = v.relative
            core.tree.root!.background = state.background
          })
        }
        if (!core.tree.root || (oldPath && oldPath !== v.filePath)) {
          await window.electron.ipcRenderer.invoke('open-space', '')
          core.tree.initial(state.spaceId)
        }
        setState({ open: false })
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
            created: now,
            relative: v.relative,
            imageFolder: v.imageFolder,
            background: state.background
          })
          setState({open: false})
          core.tree.initial(id)
          spaceChange$.next(null)
        }
      }
    })
  }, [])
  return (
    <Modal
      width={420}
      open={state.open}
      title={
        <div className={'flex items-center'}>
          <Icon icon={'material-symbols:workspaces-outline'} className={'mr-1'} />
          {state.spaceId ? state.spaceName : t('createWorkspace')}
        </div>
      }
      onCancel={() => setState({ open: false })}
      footer={null}
    >
      <div className={'text-xs text-center dark:text-white/60 mb-4 text-black/60'}>
        {t('parseTip')}
      </div>
      <Form layout={'vertical'} className={'pt-2'} form={form}>
        <Form.Item
          label={t('spaceName')}
          rules={[{ required: true }]}
          name={'name'}
        >
          <Input placeholder={t('enterName')} />
        </Form.Item>
        <Form.Item label={t('folder')}>
          <Space.Compact className={'w-full'}>
            <Form.Item rules={[{ required: true }]} name={'filePath'} noStyle={true}>
              <Input
                disabled={true}
                placeholder={t('selectFolder')}
              />
            </Form.Item>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => {
                MainApi.openDialog({
                  properties: ['createDirectory', 'openDirectory']
                }).then((res) => {
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
        <Form.Item label={t('colorIndentifer')} name={'background'}>
          <div className={'space-x-3 flex'}>
            {core.config.spaceColors.map((c) => {
              return (
                <div
                  onClick={() => {
                    setState({ background: c })
                  }}
                  className={`rounded space-${c} w-6 h-6 flex items-center justify-center cursor-pointer hover:opacity-90 duration-200 text-white`}
                  key={c}
                >
                  {state.background === c && <Icon icon={'mingcute:check-fill'} />}
                </div>
              )
            })}
          </div>
        </Form.Item>
        <Form.Item
          label={t('storageFolder')}
          tooltip={t('storageFolderTip')}
        >
          <Form.Item noStyle={true} name={'imageFolder'} initialValue={'.images'}>
            <Input placeholder={'.images'} />
          </Form.Item>
          <div className={'flex justify-end mt-1'}>
            <Form.Item noStyle={true} name={'relative'} valuePropName={'checked'}>
              <Checkbox>{t('relativePath')}</Checkbox>
            </Form.Item>
          </div>
        </Form.Item>
        <div className={'space-y-3'}>
          <Button block={true} type={'primary'} onClick={save}>
            {state.spaceId
              ? t('save')
              : t('create')}
          </Button>
          {!!state.spaceId && (
            <Button
              block={true}
              danger={true}
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
                    if (core.tree.root?.cid === state.spaceId) {
                      runInAction(() => {
                        core.tree.tabs = [core.tree.createTab()]
                        core.tree.nodeMap.clear()
                        core.tree.root = null
                        core.tree.selectItem = null
                      })
                      await window.electron.ipcRenderer.invoke('open-space', '')
                    }
                    spaceChange$.next(null)
                    setState({ open: false })
                  }
                })
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </Form>
    </Modal>
  )
})
