import { Button, Form, Input, Modal, Progress } from 'antd'
import { Subject } from 'rxjs'
import { useSubject } from '../../hooks/subscribe.ts'
import { useCoreContext } from '../../utils/env.ts'
import { IGithub } from '../../icons/IGithub.tsx'
import { openConfirmDialog$ } from '../dialog/ConfirmDialog.tsx'
import { useCallback } from 'react'
import { db } from '../../store/db.ts'
import { useGetSetState } from 'react-use'
import { observer } from 'mobx-react-lite'

export const githubSyncDialog$ = new Subject()
export const GithubSyncDialog = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useGetSetState({
    open: false,
    connected: false,
    submitting: false
  })
  const getSpaceSetting = useCallback(async () => {
    const space = await db.space.get(core.tree.root?.cid)
    if (space?.opt?.github) {
      form.setFieldsValue(space.opt.github)
      setState({ connected: true })
    } else {
      form.resetFields()
    }
  }, [])
  useSubject(githubSyncDialog$, async () => {
    setState({ open: true, connected: false })
    getSpaceSetting()
  })

  const connect = useCallback(() => {
    const cid = core.tree.root.cid
    form.validateFields().then(async (v) => {
      try {
        setState({ submitting: true })
        core.github.setConfig(v)
        const res = await core.github.connect(v)
        if (!res.ok) {
          core.message.info(
            'Connection failed, please confirm that the repository information and token are valid.',
            3
          )
        } else {
          await core.service.updateSpaceSettings(cid, {
            github: v
          })
          await core.github.initial(cid, true).catch(() => {
            core.service.updateSpaceSettings(cid, {
              github: null
            })
          })
          const docs = core.tree.docs
          await core.github.syncGithub(docs.docs, docs.map)
          core.message.success('Connection successful.')
          setState({connected: true})
        }
      } finally {
        setState({ submitting: false })
      }
    })
  }, [])
  const [form] = Form.useForm()
  return (
    <Modal
      title={
        <div className={'flex items-center'}>
          Github Sync <IGithub className={'ml-2 text-lg'} />
        </div>
      }
      open={state().open}
      footer={null}
      onCancel={() => setState({ open: false })}
      width={460}
    >
      <div className={'text-sm text-black/80 dark:text-white/80 mt-3'}>
        Inkdown will push the workspace documents to your Github repository in standard Markdown
        format. Please refer to the{' '}
        <a
          href={'https://doc.inkdown.me/book/docs/Docs/File-Conversion#push-to-github'}
          target={'_blank'}
          className={'text-teal-500 underline hover:text-teal-600 hover:underline'}
        >
          documentation
        </a>{' '}
        for usage.
      </div>
      <Form layout={'vertical'} className={'mt-5'} form={form} disabled={state().connected}>
        <Form.Item
          label={'Owner'}
          name={'owner'}
          rules={[
            {
              required: true,
              pattern: /^[^\/\\\s]+$/,
              message: 'Incorrect format.'
            }
          ]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item
          label={'Repository'}
          name={'repo'}
          rules={[
            {
              required: true,
              pattern: /^[^\/\\\s]+$/,
              message: 'Incorrect format.'
            }
          ]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item
          label={'Branch'}
          initialValue={'main'}
          name={'branch'}
          rules={[
            {
              required: true,
              pattern: /^[^\/\\\s]+$/,
              message: 'Incorrect format.'
            }
          ]}
        >
          <Input placeholder={'The main branch is used by default'} maxLength={100} />
        </Form.Item>
        <Form.Item
          label={'Token'}
          name={'token'}
          rules={[
            {
              required: true
            }
          ]}
        >
          <Input placeholder={'Github access token'} maxLength={100} />
        </Form.Item>
      </Form>
      {core.github.curStatus?.startingUpload && (
        <div className={'mt-3 mb-2'}>
          <Progress percent={(core.github.curStatus?.uploadProgress || 0) * 100} />
          <div className={'text-center text-xs'}>Uploading Media Files</div>
        </div>
      )}
      {state().connected ? (
        <Button
          block={true}
          type={'primary'}
          className={'mt-5'}
          danger={true}
          onClick={() => {
            openConfirmDialog$.next({
              title: 'Note',
              description: 'Are you sure to cancel github push?',
              onConfirm: async () => {
                const spaceCid = core.github.spaceCid
                await core.service.updateSpaceSettings(spaceCid, { github: null })
                await core.github.initial(spaceCid)
                setState({connected: false})
                form.resetFields()
              }
            })
          }}
          disabled={core.exportSpace.start}
        >
          Cancel
        </Button>
      ) : (
        <Button
          block={true}
          type={'primary'}
          className={'mt-5'}
          loading={state().submitting}
          onClick={connect}
        >
          {core.github.curStatus?.startingCommit ? 'Pushing content' : 'Connect'}
        </Button>
      )}
    </Modal>
  )
})
