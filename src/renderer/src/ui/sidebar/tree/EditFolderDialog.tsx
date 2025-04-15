import { observer } from 'mobx-react-lite'
import { Button, Input } from 'antd'
import { useCallback } from 'react'
import { Subject } from 'rxjs'
import isHotkey from 'is-hotkey'
import { Dialog } from '../dialog/Dialog.tsx'
import { useLocalState } from '../../hooks/useLocalState.ts'
import { useSubject } from '../../hooks/subscribe.ts'
import { nid } from '../../utils'
import { db, IDoc } from '../../store/db.ts'
import { runInAction } from 'mobx'
import { IFileItem } from '../../types/index'
import { useCoreContext } from '../../utils/env.ts'
import { IFolder } from '../../icons/IFolder.tsx'

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
      if (/[.\/\\]/.test(name)) {
        return setState({ message: 'Please do not include special characters' })
      }
      if (state.mode === 'create') {
        const stack = state.ctxNode ? state.ctxNode.children! : core.tree.root!.children!
        if (stack.some((s) => s.name === name && s.folder)) {
          return setState({ message: 'The folder already exists' })
        }
        const id = nid()
        const now = Date.now()
        const data: IDoc = {
          cid: id,
          name,
          deleted: 0,
          spaceId: core.tree.root!.cid,
          updated: now,
          synced: 0,
          sort: 0,
          parentCid: state.ctxNode?.cid,
          folder: true,
          created: now
        }
        await db.doc.add(data)
        core.ipc.sendMessage({
          type: 'createFolder',
          data: { cid: id, spaceCid: core.tree.root.cid, parentCid: state.ctxNode?.cid }
        })
        const node = await core.node.createFileNode(data, state.ctxNode || core.tree.root!)
        runInAction(() => {
          core.tree.nodeMap.set(node.cid, node)
          stack.unshift(node)
          stack.map((s, i) => {
            db.doc.update(s.cid, { sort: i, updated: now })
          })
          core.local.localWriteNode(node)
          core.api.creatDoc
            .mutate({
              doc: {
                cid: id,
                name,
                spaceCid: core.tree.root!.cid,
                parentCid: state.ctxNode?.cid,
                updated: now,
                sort: 0,
                folder: true
              },
              sort: stack.map((s) => s.cid)
            })
            .then((res) => {
              if (res.ok) {
                db.doc.update(data.cid, { synced: 1 })
              }
            })
            .catch(core.pay.catchLimit())
        })
      } else if (state.ctxNode) {
        const ctx = state.ctxNode
        const stack = ctx.parent ? ctx.parent.children! : core.tree.root!.children!
        if (stack.some((s) => s.name === name && s.folder && s.cid !== ctx.cid)) {
          return setState({ message: 'The folder already exists' })
        }
        core.service.rename(ctx, name)
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
      open={state.open}
      onClose={close}
      title={
        <div className={'flex items-center'}>
          <IFolder className={'text-lg'}/>
          <span className={'ml-1'}>{state.mode === 'create' ? 'Create New Folder' : 'Update'}</span>
        </div>
      }
    >
      <div className={'w-[300px] p-5 flex flex-col items-center'}>
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
