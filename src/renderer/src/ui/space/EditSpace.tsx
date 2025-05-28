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
import { useTranslation } from 'react-i18next'

export const EditSpace = observer(() => {
  const { t } = useTranslation()
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false,
    spaceId: '',
    filePath: '',
    spaceName: '',
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
        content: t('workspace.directoryUsed')
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
            content: t('workspace.nameExists')
          })
        }
        if (state.filePath && exist.writeFolderPath === state.filePath) {
          store.msg.open({
            type: 'info',
            content: t('workspace.directoryUsed')
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
          <span className={'text-sm'}>{t('workspace.create')}</span>
        </div>
      }
      onCancel={() => setState({ open: false })}
    >
      <div className={'py-3'}>
        <Form layout={'vertical'}>
          <Form.Item label={t('workspace.name')}>
            <Space.Compact className={'w-full'}>
              <Input
                placeholder={t('workspace.enterName')}
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
          <Form.Item label={t('workspace.directory')} tooltip={t('workspace.directoryTip')}>
            <Space.Compact className={'w-full'}>
              <Input
                readOnly={true}
                value={state.filePath}
                placeholder={t('workspace.selectFolder')}
              />
              <Button
                icon={state.filePath ? <CloseCircleOutlined /> : <FolderOpenOutlined />}
                onClick={async () => {
                  if (state.filePath) {
                    store.note.openConfirmDialog$.next({
                      title: t('tip'),
                      description: t('workspace.cancelWriteHint'),
                      okText: t('ok'),
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
                            content: t('workspace.directoryUsed')
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
                            store.msg.success(t('workspace.filesWritten'))
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
                {t('create')}
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
                            placeholder={t('workspace.enterName')}
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
                              title: t('workspace.confirmDelete'),
                              okText: t('workspace.delete'),
                              onConfirm: async () => {
                                await store.model.deleteSpace(state.space!.id)
                                store.note.setState((draft) => {
                                  draft.spaces = draft.spaces.filter(
                                    (s) => s.id !== state.space!.id
                                  )
                                  store.note.selectSpace(draft.spaces[0].id)
                                })
                                setState({ open: false })
                                store.msg.success(t('workspace.deleted'))
                              }
                            })
                          }}
                          disabled={
                            state.inputDeleteName !== state.space.name ||
                            store.note.state.spaces.length === 1
                          }
                        >
                          {t('workspace.delete')}
                        </Button>
                        <div
                          className={
                            'text-xs text-center mt-4 text-black/70 dark:text-white/70 px-10'
                          }
                        >
                          {store.note.state.spaces.length > 1
                            ? t('workspace.deleteHint')
                            : t('workspace.minSpaceHint')}
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
