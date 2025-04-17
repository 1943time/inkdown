import { observer } from 'mobx-react-lite'
import { Button, Collapse, Form, Input, Modal, Progress, Space, Tag } from 'antd'
import { CloseCircleOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'
import { useCallback, useEffect } from 'react'
import { action, runInAction } from 'mobx'
import { useStore } from '@/store/store'
import { ISpace } from 'types/model'
import { useLocalState } from '@/hooks/useLocalState'
import { useSubject } from '@/hooks/common'
import { nanoid } from 'nanoid'
import { Folders } from 'lucide-react'

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
    progress: 0,
    startWriting: false
  })

  useSubject(store.note.openEditSpace$, async (spaceId) => {
    if (spaceId) {
      store.model.getSpace({ id: spaceId }).then((space) => {
        if (space) {
          setState({
            space,
            spaceName: space.name,
            filePath: space.writeFolderPath,
            open: true,
            spaceId: space.id,
            inputDeleteName: ''
          })
        }
      })
    } else {
      setState({
        open: true,
        spaceId: '',
        spaceName: '',
        filePath: '',
        space: null,
        inputDeleteName: ''
      })
    }
  })

  const validatePath = useCallback(async (filePath: string, spaceId?: string) => {
    // const includeSpace = await db.space
    //   .filter((s) => !!s.filePath && filePath.startsWith(s.filePath || ''))
    //   .first()
    // if (includeSpace && (!spaceId || includeSpace.cid !== spaceId)) {
    //   return false
    // }
    // return true
  }, [])

  const save = useCallback(async () => {
    // if (state.filePath && !(await validatePath(state.filePath, state.spaceId))) {
    //   core.message.open({
    //     type: 'info',
    //     content: 'This directory is already included in another space'
    //   })
    //   return
    // }
    if (state.space) {
      store.model.updateSpace(state.space.id, {
        name: state.spaceName,
        writeFolderPath: state.filePath
      })
      if (state.spaceId === store.note.state.currentSpace?.id) {
        store.note.setState((draft) => {
          draft.currentSpace!.name = state.spaceName
          draft.currentSpace!.writeFolderPath = state.filePath
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
          setState({ submitting: true })
          const id = nanoid()
          const now = Date.now()
          await store.model.createSpace({
            id,
            name: state.spaceName,
            writeFolderPath: state.filePath,
            created: now,
            lastOpenTime: now,
            sort: 0
          })
          setState({ open: false })
          store.note.selectSpace(id)
        } finally {
          setState({ submitting: false })
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
          <Folders className={'mr-1 text-lg'} />
          <span className={'text-sm'}>{state.space ? state.space.name : 'Create a workspace'}</span>
        </div>
      }
      onCancel={() => setState({ open: false })}
    >
      <div className={'pb-3'}>
        <Form layout={'vertical'} className={'pt-2'}>
          <Form.Item label={'Space Name'}>
            <Space.Compact className={'w-full'}>
              <Input
                placeholder={'Enter Name'}
                value={state.spaceName}
                onChange={(e) => setState({ spaceName: e.target.value })}
                maxLength={50}
              />
              {!!state.space && (
                <Button
                  icon={<SaveOutlined />}
                  loading={state.submitting}
                  disabled={!state.spaceName || state.spaceName === state.space?.name}
                  onClick={() => {
                    if (store.note.state.spaces.some((s) => s.name === state.spaceName)) {
                      store.msg.open({
                        type: 'info',
                        content: 'The space name already exists'
                      })
                    } else {
                      const name = state.spaceName
                      setState({ submitting: true })
                      store.model
                        .updateSpace(state.space!.id, {
                          name: name
                        })
                        .then(() => {
                          setState({
                            space: {
                              ...state.space!,
                              name: name
                            }
                          })
                          store.note.setState((draft) => {
                            draft.currentSpace!.name = name
                          })
                          store.msg.success('Saved successfully')
                        })
                        .finally(() => {
                          setState({ submitting: false })
                        })
                    }
                  }}
                />
              )}
            </Space.Compact>
          </Form.Item>
          <Form.Item
            label={'Workspace Location'}
            tooltip={{
              title: (
                <div>
                  After setting, the documents and attachments in the space will be synchronized
                  with the bound folder in real time in standard markdown format. The attachments
                  will be saved in the <Tag color={'blue'}>.files</Tag> folder. To ensure the
                  writing speed, Inkdown only writes files within 5mb
                </div>
              ),
              overlayInnerStyle: { width: 320 }
            }}
          >
            <Space.Compact className={'w-full'}>
              <Input disabled={true} value={state.filePath} placeholder={'Choose Folder'} />
              <Button
                icon={state.filePath ? <CloseCircleOutlined /> : <FolderOpenOutlined />}
                onClick={async () => {
                  if (state.filePath) {
                    store.note.openConfirmDialog$.next({
                      title: 'Note',
                      description:
                        'After canceling, files will no longer be written to the folder in real time.',
                      okText: 'Confirm',
                      onConfirm: () => {
                        setState({ filePath: '' })
                        store.model.updateSpace(state.space!.id, {
                          writeFolderPath: undefined
                        })
                        if (state.spaceId === store.note.state.root.id) {
                          store.note.setState((draft) => {
                            draft.currentSpace!.writeFolderPath = undefined
                          })
                        }
                      }
                    })
                  } else {
                    // core.local.chooseLocalFolder().then(async (res) => {
                    //   if (res.filePaths.length) {
                    //     const path = res.filePaths[0]
                    //     const includeSpace = await db.space
                    //       .filter((s) => !!s.filePath && path.startsWith(s.filePath || ''))
                    //       .first()
                    //     if (
                    //       includeSpace &&
                    //       (!state.spaceId || includeSpace.cid !== state.spaceId)
                    //     ) {
                    //       core.message.open({
                    //         type: 'info',
                    //         content: 'This directory is already included in another space'
                    //       })
                    //       return
                    //     }
                    //     setState({ filePath: path })
                    //     if (state.spaceId) {
                    //       db.space.update(state.spaceId, { filePath: res.filePaths[0] })
                    //     }
                    //     if (state.spaceId === core.tree.root.cid) {
                    //       runInAction(() => {
                    //         core.tree.root.filePath = path
                    //       })
                    //     }
                    //     if (state.space) {
                    //       setState({ startWriting: true, progress: 0 })
                    //       core.exportSpace.exportToLocal({
                    //         rootPath: state.filePath,
                    //         onProgress: (p) => {
                    //           setState({ progress: p })
                    //           if (p === 100) {
                    //             setState({ startWriting: false, progress: 0 })
                    //           }
                    //         }
                    //       })
                    //     }
                    //   }
                    // })
                  }
                }}
              ></Button>
            </Space.Compact>
          </Form.Item>
          {state.startWriting && (
            <div className={'mb-6'}>
              <Progress
                percent={state.progress}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068'
                }}
              />
              <div className={'text-center text-xs text-black/70 dark:text-white/70'}>
                Writing data...
              </div>
            </div>
          )}
          <div className={'space-y-3'}>
            {!state.spaceId && (
              <Button
                block={true}
                type={'primary'}
                onClick={save}
                disabled={!state.spaceName}
                loading={state.submitting}
              >
                {'Create Workspace'}
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
                            className={'mb-4'}
                            value={state.inputDeleteName}
                            onChange={(e) => setState({ inputDeleteName: e.target.value })}
                          />
                        )}
                        <Button
                          type={'primary'}
                          danger={true}
                          block={true}
                          onClick={() => {
                            store.note.openConfirmDialog$.next({
                              title:
                                'Confirm delete? All files in the space will be permanently deleted.',
                              okText: 'Delete',
                              onConfirm: async () => {
                                await store.model.deleteSpace(state.space!.id)
                                store.note.setState((draft) => {
                                  const space = draft.spaces.find((s) => s.id !== state.spaceId)
                                  if (space) {
                                    draft.selectedSpaceId = space.id
                                  }
                                  draft.spaces = draft.spaces.filter((s) => s.id !== state.spaceId)
                                  store.note.selectSpace()
                                })
                                setState({ open: false })
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
                            ? 'Permanently delete space documents and related media files'
                            : 'At least one workspace must be reserved'}
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
