import { observer } from 'mobx-react-lite'
import { CloseCircleOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'
import { useCallback } from 'react'
import { runInAction } from 'mobx'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState'
import { ISpace } from 'types/model'
import { useSubject } from '@/hooks/common'
import { nid } from '@/utils/common'
import { IWorkspace } from '@/icons/IWorkspace'
import { Space, Form, Input, Modal, Collapse, Button } from 'antd'

export const EditSpace = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false,
    spaceId: '',
    filePath: '',
    spaceName: '',
    cloud: false,
    background: 'sky',
    inputDeleteName: '',
    submitting: false,
    space: null as null | ISpace,
    startWriting: false
  })

  useSubject(store.note.openEditSpace$, (spaceId) => {
    if (spaceId) {
      store.model.getSpace({ id: spaceId }).then((res) => {
        setState({
          space: res,
          spaceName: res?.name,
          spaceId,
          filePath: res?.writeFolderPath || '',
          open: true,
          inputDeleteName: '',
          startWriting: false
        })
      })
    } else {
      setState({
        open: true,
        spaceId: '',
        spaceName: '',
        filePath: '',
        space: null,
        inputDeleteName: '',
        startWriting: false
      })
    }
  })

  const validatePath = useCallback(async (filePath: string, spaceId?: string) => {
    const includeSpace = await store.model.getSpace({ writeFolderPath: filePath })
    if (includeSpace && (!spaceId || includeSpace.id !== spaceId)) {
      return false
    }
    return true
  }, [])

  const save = useCallback(async () => {
    if (state.filePath && !(await validatePath(state.filePath, state.spaceId))) {
      store.msg.open({
        type: 'info',
        content: 'This directory is already included in another space'
      })
      return
    }
    if (state.space) {
      await store.model.updateSpace(state.space.id, {
        name: state.spaceName,
        writeFolderPath: state.filePath
      })
      if (state.spaceId === store.note.state.currentSpace?.id) {
        runInAction(() => {
          store.note.state.currentSpace!.name = state.spaceName
          store.note.state.currentSpace!.writeFolderPath = state.filePath
        })
      }
      setState({ open: false })
    } else {
      const exist = await store.model.getSpace({
        name: state.spaceName,
        writeFolderPath: state.filePath
      })
      if (exist) {
        if (exist.name === state.spaceName) {
          store.msg.open({
            type: 'info',
            content: 'Space name already exists'
          })
        }
        if (state.filePath && exist.writeFolderPath === state.filePath) {
          store.msg.open({
            type: 'info',
            content: 'The folder is already used by another space'
          })
        }
      } else {
        try {
          const id = nid()
          const now = Date.now()
          await store.model.createSpace({
            id,
            name: state.spaceName,
            writeFolderPath: state.filePath,
            sort: 0,
            created: now,
            lastOpenTime: now
          })
          store.note.init(id)
          setState({ open: false })
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])
  return (
    <Modal
      open={state.open}
      footer={null}
      width={400}
      title={
        <div className={'flex items-center'}>
          <IWorkspace className={'mr-1 text-lg'} />
          <span className={'text-sm'}>{'创建工作空间'}</span>
        </div>
      }
      onCancel={() => setState({ open: false })}
    >
      <div className={'py-3'}>
        <Form layout={'vertical'}>
          <Form.Item label={'空间名称'}>
            <Space.Compact className={'w-full'}>
              <Input
                placeholder={'输入名称'}
                value={state.spaceName}
                onChange={(e) => setState({ spaceName: e.target.value })}
                maxLength={50}
              />
              {!!state.spaceId && (
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => {
                    store.model
                      .updateSpace(state.spaceId, {
                        name: state.spaceName
                      })
                      .then(() => {
                        store.note.setState((draft) => {
                          draft.currentSpace!.name = state.spaceName
                        })
                      })
                  }}
                />
              )}
            </Space.Compact>
          </Form.Item>
          <Form.Item label={'空间目录'} tooltip={'选择文件夹后，文档与附件将实时写入文件夹内'}>
            <Space.Compact className={'w-full'}>
              <Input readOnly={true} value={state.filePath} placeholder={'请选择文件夹'} />
              <Button
                icon={state.filePath ? <CloseCircleOutlined /> : <FolderOpenOutlined />}
                onClick={async () => {
                  if (state.filePath) {
                    store.note.openConfirmDialog$.next({
                      title: 'Note',
                      description: '取消后，文件将不再实时写入到该文件夹。',
                      okText: 'Confirm',
                      onConfirm: () => {
                        setState({ filePath: '' })
                        store.model.updateSpace(state.space!.id, {
                          writeFolderPath: null
                        })
                        if (state.spaceId === store.note.state.currentSpace?.id) {
                          runInAction(() => {
                            store.note.state.currentSpace!.writeFolderPath = null
                          })
                        }
                      }
                    })
                  } else {
                    store.local.chooseLocalFolder().then(async (res) => {
                      if (res.filePaths.length) {
                        const path = res.filePaths[0]
                        const includeSpace = await store.model.getSpace({
                          writeFolderPath: path
                        })
                        if (includeSpace && (!state.spaceId || includeSpace.id !== state.spaceId)) {
                          store.msg.open({
                            type: 'info',
                            content: 'This directory is already included in another space'
                          })
                          return
                        }
                        setState({ filePath: path })
                        if (state.spaceId) {
                          store.model.updateSpace(state.spaceId, {
                            writeFolderPath: path
                          })
                        }
                        if (state.spaceId === store.note.state.currentSpace?.id) {
                          runInAction(() => {
                            store.note.state.currentSpace!.writeFolderPath = path
                          })
                        }
                        if (state.space) {
                          setState({ startWriting: true })
                          store.local.initialRewrite(store.note.state.nodes).then(() => {
                            store.msg.success('文件已写入')
                          })
                        }
                      }
                    })
                  }
                }}
              ></Button>
            </Space.Compact>
          </Form.Item>
          <div className={'space-y-3'}>
            {!state.spaceId && (
              <Button
                block={true}
                type={'primary'}
                onClick={save}
                disabled={!state.spaceName}
                loading={state.submitting}
              >
                {'创建'}
              </Button>
            )}
            {!!state.space && (
              <Collapse
                size={'small'}
                className={'select-none'}
                items={[
                  {
                    key: 'delete',
                    label: 'More',
                    children: (
                      <div>
                        {store.note.state.spaces.length > 1 && (
                          <Input
                            placeholder={'Enter space name to delete'}
                            value={state.inputDeleteName}
                            onChange={(e) => setState({ inputDeleteName: e.target.value })}
                          />
                        )}
                        <Button
                          type={'primary'}
                          danger={true}
                          block={true}
                          className={'mt-4'}
                          onClick={() => {
                            store.note.openConfirmDialog$.next({
                              title: '确认删除空间',
                              okText: 'Delete',
                              onConfirm: async () => {
                                await store.model.deleteSpace(state.space!.id)
                                store.note.setState((draft) => {
                                  draft.spaces = draft.spaces.filter(
                                    (s) => s.id !== state.space!.id
                                  )
                                  store.note.selectSpace(draft.spaces[0].id)
                                })
                                setState({ open: false })
                                store.msg.success('Workspace deleted')
                                // core.ipc.sendMessage({ type: 'deleteSpace', data: cid })
                              }
                            })
                          }}
                          disabled={
                            state.inputDeleteName !== state.space.name ||
                            store.note.state.spaces.length === 1
                          }
                        >
                          Delete
                        </Button>
                        <div
                          className={
                            'text-xs text-center mt-4 text-black/70 dark:text-white/70 px-10'
                          }
                        >
                          {store.note.state.spaces.length > 1
                            ? '永久删除空间文档和相关媒体文件'
                            : '至少需要保留一个工作空间'}
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            )}
          </div>
        </Form>
      </div>
    </Modal>
  )
})
