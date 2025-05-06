import { Button, Input } from 'antd'
import { useCallback } from 'react'
import isHotkey from 'is-hotkey'
import { useStore } from '@/store/store'
import { useGetSetState } from 'react-use'
import { IDoc } from 'types/model'
import { useSubject } from '@/hooks/common'
import { Dialog } from '@/ui/dialog/Dialog'
import { FolderClosed } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { delayRun } from '@/utils/common'

export const EditFolderDialog = observer(() => {
  const store = useStore()
  const [state, setState] = useGetSetState({
    open: false,
    name: '',
    color: '',
    mode: 'create' as 'create' | 'update',
    message: '',
    ctxNode: null as null | IDoc
  })

  const confirm = useCallback(async () => {
    const name = state().name.trim()
    const nodes = store.note.state.nodes
    if (name) {
      if (/[.\/\\]/.test(name)) {
        return setState({ message: 'Please do not include special characters' })
      }
      if (state().mode === 'create') {
        const stack = state().ctxNode ? state().ctxNode!.children! : nodes['root']!.children!
        if (stack.some((s) => s.name === name && s.folder)) {
          return setState({ message: 'The folder already exists' })
        }
        store.menu.createFolder(name, state().ctxNode?.id || 'root')
      } else if (state().ctxNode) {
        const ctx = state().ctxNode!
        const stack = ctx.parentId ? nodes[ctx.parentId]!.children! : nodes['root']!.children!
        if (stack.some((s) => s.name === name && s.folder && s.id !== ctx.id)) {
          return setState({ message: 'The folder already exists' })
        }
        const oldPath = store.note.getDocPath(ctx).join('/')
        const now = Date.now()
        store.model.updateDoc(ctx.id, { name, updated: now })
        store.note.setState(() => {
          ctx.name = name
          ctx.updated = now
        })
        store.local.localRename(oldPath, ctx)
        delayRun(() => {
          store.note.refactor.refactor(ctx, oldPath)
        })
      }
      close()
    }
  }, [])

  const enter = useCallback((e: KeyboardEvent) => {
    if (isHotkey('enter', e)) {
      confirm()
    }
  }, [])

  const close = useCallback(() => {
    window.removeEventListener('keydown', enter)
    setState({ open: false })
  }, [])

  useSubject(store.note.openEditFolderDialog$, (params) => {
    setState({
      open: true,
      mode: params.mode,
      message: '',
      name: params.mode === 'update' && params.ctxNode ? params.ctxNode.name : '',
      ctxNode: params.ctxNode
    })
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-type="folderInputName"]')?.focus()
    }, 100)
    window.addEventListener('keydown', enter)
  })
  return (
    <Dialog
      open={state().open}
      onClose={close}
      title={
        <div className={'flex items-center'}>
          <FolderClosed size={16} />
          <span className={'ml-2'}>
            {state().mode === 'create' ? 'Create New Folder' : 'Update'}
          </span>
        </div>
      }
    >
      <div className={'w-[300px] p-5 flex flex-col items-center'}>
        <Input
          placeholder={'Folder Name'}
          data-type={'folderInputName'}
          value={state().name}
          onChange={(e) => {
            setState({ name: e.target.value })
            if (!e.target.value) {
              setState({ message: '' })
            }
          }}
        />
        {state().message && (
          <div className={'text-amber-500 pt-1 text-[13px] w-full'}>{state().message}</div>
        )}
        <Button
          type={'primary'}
          block={true}
          disabled={!state().name}
          className={'mt-4'}
          onClick={confirm}
        >
          {state().mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </div>
    </Dialog>
  )
})
