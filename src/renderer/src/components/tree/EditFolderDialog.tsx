import { observer } from 'mobx-react-lite'
import { Button, Input } from 'antd'
import { useCallback } from 'react'
import { Subject } from 'rxjs'
import isHotkey from 'is-hotkey'
import { Dialog } from '../Dialog/Dialog'
import { IFileItem } from '../../index'
import { useLocalState } from '../../hooks/useLocalState'
import { useSubject } from '../../hooks/subscribe'
import { nid } from '../../utils'
import { db, IFile } from '../../store/db'
import { join } from 'path'
import { runInAction } from 'mobx'
import { mkdirSync } from 'fs'
import { updateFilePath } from '../../editor/utils/updateNode'
import IFolder from '../../icons/IFolder'
import { useCoreContext } from '../../store/core'

export const openEditFolderDialog$ = new Subject<{
  ctxNode?: IFileItem
  mode: 'create' | 'update'
}>()
export const EditFolderDialog = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    open: false,
    name: '',
    color: '',
    mode: 'create' as 'create' | 'update',
    message: '',
    ctxNode: null as null | IFileItem
  })

  const confirm = useCallback(async () => {
    const name = state.name.trim()
    if (name) {
      if (state.mode === 'create') {
        const stack = state.ctxNode ? state.ctxNode.children! : core.tree.root!.children!
        if (stack.some((s) => s.filename === name && s.folder)) {
          return setState({ message: 'The folder already exists' })
        }
        const id = nid()
        const now = Date.now()
        const data: IFile = {
          cid: id,
          filePath: state.ctxNode
            ? join(state.ctxNode.filePath, name)
            : join(core.tree.root!.filePath, name),
          spaceId: core.tree.root!.cid,
          updated: now,
          sort: 0,
          folder: true,
          created: now
        }
        await db.file.add(data)
        mkdirSync(data.filePath)
        runInAction(() => {
          const node = core.node.createFileNode(data, state.ctxNode || core.tree.root!)
          stack.unshift(node)
          stack.map((s, i) => {
            db.file.update(s.cid, { sort: i })
          })
        })
      } else if (state.ctxNode) {
        const ctx = state.ctxNode
        const stack = ctx.parent ? ctx.parent.children! : core.tree.root!.children!
        if (stack.some((s) => s.filename === name && s.folder && s.cid !== ctx.cid)) {
          return setState({ message: 'The folder already exists' })
        }
        const oldPath = ctx.filePath
        const target = join(state.ctxNode.filePath, '..', name)
        await db.file.update(ctx.cid, {
          filePath: join(ctx.filePath, '..', name)
        })
        await updateFilePath(ctx, target)
        core.refactor.refactorDepOnLink(ctx, oldPath)
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

  useSubject(openEditFolderDialog$, (params) => {
    setState({
      open: true,
      mode: params.mode,
      message: '',
      name: params.mode === 'update' && params.ctxNode ? params.ctxNode.filename : '',
      ctxNode: params.ctxNode
    })
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-type="folderInputName"]')?.focus()
    }, 100)
    window.addEventListener('keydown', enter)
  })
  return (
    <Dialog
      open={state.open}
      onClose={close}
      title={
        <div className={'flex items-center'}>
          <IFolder className={'text-lg'} />
          <span className={'ml-1'}>{state.mode === 'create' ? 'Create New Folder' : 'Update'}</span>
        </div>
      }
    >
      <div className={'w-[280px] p-5 flex flex-col items-center'}>
        <Input
          placeholder={'Folder Name'}
          data-type={'folderInputName'}
          value={state.name}
          onChange={(e) => {
            setState({ name: e.target.value })
            if (!e.target.value) {
              setState({ message: '' })
            }
          }}
        />
        {state.message && (
          <div className={'text-amber-500 pt-1 text-[13px] w-full'}>{state.message}</div>
        )}
        <Button
          type={'primary'}
          block={true}
          disabled={!state.name}
          className={'mt-4'}
          onClick={confirm}
        >
          {state.mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </div>
    </Dialog>
  )
})
