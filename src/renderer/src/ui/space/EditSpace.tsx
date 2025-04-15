import { observer } from 'mobx-react-lite'
import { Button, Collapse, Form, Input, Modal, Progress, Space, Tag } from 'antd'
import { useLocalState } from '../../hooks/useLocalState.ts'
import { CloseCircleOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'
import { Subject } from 'rxjs'
import { useSubject } from '../..//hooks/subscribe.ts'
import { useCallback, useEffect } from 'react'
import { ISpace, db } from '../..//store/db.ts'
import { nid } from '../../utils'
import { openConfirmDialog$ } from '../dialog/ConfirmDialog.tsx'
import { action, runInAction } from 'mobx'
import { useCoreContext } from '../..//utils/env.ts'
import { IWorkspace } from '../../icons/IWorkspace.tsx'
import { ICheck } from '../../icons/ICheck.tsx'

export const editSpace$ = new Subject<string | null>()

export const EditSpace = observer(() => {
  const core = useCoreContext()
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

  useSubject(editSpace$, (spaceId) => {
    if (spaceId) {
      db.space.get(spaceId).then((res) => {
        if (res) {
          setState({
            space: res,
            spaceName: res.name,
            spaceId,
            filePath: res.filePath,
            open: true,
            background: res.background || 'sky',
            inputDeleteName: ''
          })
          if (res.$f) {
            const name = res.$f.name
            setState({
              filePath: name
            })
          }
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
    if (core.desktop) {
      const includeSpace = await db.space
        .filter((s) => !!s.filePath && filePath.startsWith(s.filePath || ''))
        .first()
      if (includeSpace && (!spaceId || includeSpace.cid !== spaceId)) {
        return false
      }
    }
    return true
  }, [])

  const save = useCallback(async () => {
    if (state.filePath && !(await validatePath(state.filePath, state.spaceId))) {
      core.message.open({
        type: 'info',
        content: 'This directory is already included in another space'
      })
      return
    }
    if (state.space) {
      await db.space.update(state.spaceId, {
        name: state.spaceName,
        filePath: state.filePath,
        settings: {
          background: state.background
        }
      })
      if (state.spaceId === core.tree.root?.cid) {
        runInAction(() => {
          core.tree.root!.filePath = state.filePath
          core.tree.root!.name = state.spaceName
          core.tree.root.settings = {
            background: state.background
          }
        })
      }
      setState({ open: false })
    } else {
      const exist = await db.space
        .filter(
          (s) => s.name === state.spaceName || (!!s.filePath && s.filePath === state.filePath)
        )
        .first()
      if (exist) {
        if (exist.name === state.spaceName) {
          core.message.open({
            type: 'info',
            content: 'Space name already exists'
          })
        }
        if (state.filePath && exist.filePath === state.filePath) {
          core.message.open({
            type: 'info',
            content: 'The folder is already used by another space'
          })
        }
      } else {
        try {
          setState({ submitting: true })
          const id = nid()
          await core.api.createSpace
            .mutate({
              background: state.background,
              name: state.spaceName,
              cid: id
            })
            .catch(core.pay.catchLimit())
          const count = await db.space.count()
          const now = Date.now()
          await db.space.add({
            cid: id,
            name: state.spaceName,
            filePath: state.filePath,
            sort: count,
            lastOpenTime: now,
            created: now,
            background: state.background,
            opt: {}
          })
          core.service.initialOffline(id, false)
          setState({ open: false })
          core.service.resetSpaces()
        } finally {
          setState({ submitting: false })
        }
      }
    }
  }, [])
  useEffect(() => {
    setState({
      startWriting: false,
      progress: 0
    })
  }, [core.tree.root?.cid])
  return (
    <Modal
      open={state.open}
      footer={null}
      width={400}
      title={
        <div className={'flex items-center'}>
          <IWorkspace className={'mr-1 text-lg'} />
          <span className={'text-sm'}>
            {state.space
              ? state.space.name
              : core.config.zh
                ? '创建工作空间'
                : 'Create a workspace'}
          </span>
        </div>
      }
      onCancel={() => setState({ open: false })}
    >
      <div className={'pb-3'}>
        <Form layout={'vertical'} className={'pt-2'}>
          <Form.Item label={core.config.zh ? '空间名称' : 'Space Name'}>
            <Space.Compact className={'w-full'}>
              <Input
                placeholder={core.config.zh ? '输入名称' : 'Enter Name'}
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
                    if (core.service.spaces.some((s) => s.name === state.spaceName)) {
                      core.message.info('The space name already exists')
                    } else {
                      const name = state.spaceName
                      setState({ submitting: true })
                      core.api.updateSpace
                        .mutate({
                          name: name,
                          cid: state.space!.cid
                        })
                        .then(() => {
                          setState({
                            space: {
                              ...state.space!,
                              name: name
                            }
                          })
                          db.space.update(state.space!.cid, { name })
                          core.service.spaces.some(
                            action((s) => {
                              if (s.cid === state.space?.cid) {
                                s.name = name
                              }
                            })
                          )
                          runInAction(() => {
                            core.tree.root.name = name
                          })
                          core.message.success('Saved successfully')
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
            label={core.config.zh ? '空间目录' : 'Workspace Location'}
            tooltip={{
              title: (
                <div>
                  After setting, the documents and attachments in the space will be synchronized
                  with the bound folder in real time in standard markdown format. The attachments
                  will be saved in the <Tag color={'blue'}>.files</Tag> folder. To ensure the writing speed,
                  Inkdown only writes files within 5mb
                </div>
              ),
              overlayInnerStyle: { width: 320 }
            }}
          >
            <Space.Compact className={'w-full'}>
              <Input
                disabled={true}
                value={state.filePath}
                placeholder={core.config.zh ? '请选择文件夹' : 'Choose Folder'}
              />
              <Button
                icon={state.filePath ? <CloseCircleOutlined /> : <FolderOpenOutlined />}
                onClick={async () => {
                  core.local.checkLocalSupport()
                  if (state.filePath) {
                    openConfirmDialog$.next({
                      title: 'Note',
                      description:
                        'After canceling, files will no longer be written to the folder in real time.',
                      okText: 'Confirm',
                      onConfirm: () => {
                        setState({ filePath: '' })
                        db.space.update(state.space!.cid, {
                          filePath: undefined,
                          $f: undefined
                        })
                        if (state.spaceId === core.tree.root.cid) {
                          runInAction(() => {
                            core.tree.root.filePath = ''
                            core.tree.root.$fd = undefined
                          })
                        }
                      }
                    })
                  } else {
                    if (core.desktop) {
                      core.local.chooseLocalFolder().then(async (res) => {
                        if (res.filePaths.length) {
                          const path = res.filePaths[0]
                          const includeSpace = await db.space
                            .filter((s) => !!s.filePath && path.startsWith(s.filePath || ''))
                            .first()
                          if (
                            includeSpace &&
                            (!state.spaceId || includeSpace.cid !== state.spaceId)
                          ) {
                            core.message.open({
                              type: 'info',
                              content: 'This directory is already included in another space'
                            })
                            return
                          }
                          setState({ filePath: path })
                          if (state.spaceId) {
                            db.space.update(state.spaceId, { filePath: res.filePaths[0] })
                          }
                          if (state.spaceId === core.tree.root.cid) {
                            runInAction(() => {
                              core.tree.root.filePath = path
                            })
                          }
                          if (state.space) {
                            setState({ startWriting: true, progress: 0 })
                            core.exportSpace.exportToLocal({
                              rootPath: state.filePath,
                              onProgress: (p) => {
                                setState({ progress: p })
                                if (p === 100) {
                                  setState({ startWriting: false, progress: 0 })
                                }
                              }
                            })
                          }
                        }
                      })
                    } else {
                      const res = await core.local.chooseFolder()
                      if (state.space) {
                        db.space.update(state.space.cid, { $f: res })
                        if (state.space.cid === core.tree.root.cid) {
                          core.tree.root.$fd = res
                          setState({ filePath: res.name })
                          await core.local.setFilesHandle(res, core.tree.root)
                          await core.exportSpace.exportToLocalByWeb({
                            root: core.tree.root.$fd,
                            onProgress: (p) => {
                              setState({ progress: p })
                              if (p === 100) {
                                setState({ startWriting: false, progress: 0 })
                              }
                            }
                          })
                        }
                      }
                    }
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
          <Form.Item label={core.config.zh ? '定义颜色' : 'Color Indentifer'} name={'background'}>
            <div className={'space-x-3 flex'}>
              {core.config.spaceColors.map((c) => {
                return (
                  <div
                    onClick={() => {
                      setState({ background: c })
                      if (state.space) {
                        core.api.updateSpace.mutate({
                          cid: state.space.cid,
                          background: c
                        })
                        db.space.update(state.space!.cid, { background: c })
                        core.service.spaces.some(
                          action((s) => {
                            if (s.cid === state.space?.cid) {
                              s.background = c
                            }
                          })
                        )
                        runInAction(() => {
                          core.tree.root.background = c
                        })
                      }
                    }}
                    className={`rounded space-${c} w-6 h-6 flex items-center justify-center cursor-pointer hover:opacity-90 duration-200 text-white`}
                    key={c}
                  >
                    {state.background === c && <ICheck />}
                  </div>
                )
              })}
            </div>
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
                {core.config.zh ? '创建' : 'Create Workspace'}
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
                        {core.service.spaces.length > 1 && (
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
                            openConfirmDialog$.next({
                              title:
                                'Confirm delete? All files in the space will be permanently deleted.',
                              okText: 'Delete',
                              onConfirm: async () => {
                                const cid = state.space?.cid!
                                await core.api.deleteSpace.mutate({
                                  cid
                                })
                                await db.deleteSpace(cid)
                                await core.service.resetSpaces()
                                await core.service.initialOffline()
                                setState({ open: false })
                                core.message.success('Workspace deleted')
                                core.ipc.sendMessage({ type: 'deleteSpace', data: cid })
                              }
                            })
                          }}
                          disabled={
                            state.inputDeleteName !== state.space.name ||
                            core.service.spaces.length === 1
                          }
                        >
                          Delete
                        </Button>
                        <div
                          className={
                            'text-xs text-center mt-4 text-black/70 dark:text-white/70 px-10'
                          }
                        >
                          {core.service.spaces.length > 1
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
