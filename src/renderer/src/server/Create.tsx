import { Button, Checkbox, Modal, notification, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { Subject } from 'rxjs'
import { useSubject } from '../hooks/subscribe'
import { useLocalState } from '../hooks/useLocalState'
import '../editor/utils/ace'
import ace, { Ace } from 'ace-builds'
import { useCallback, useRef } from 'react'
import { useCoreContext } from '../store/core'
import { join } from 'path'
import { sortTree, DataTree } from '@inkdown/client'
import { readdir } from 'fs/promises'
import { statSync } from 'fs'
import { nanoid } from 'nanoid'
import { useSetState } from 'react-use'
import { EditorUtils } from '../editor/utils/editorUtils'

function DeleteSettingsFile(props: {
  onChange: (checked: boolean) => void
}) {
  const [state, setState] = useSetState({
    checked: false
  })
  return (
    <div>
      <div className={'mb-1'}>Cannot access via network after unpublishing</div>
      <Checkbox checked={state.checked} onChange={e => {
        setState({checked: e.target.checked})
        props.onChange(e.target.checked)
      }}>Delete the configuration file at the same time</Checkbox>
    </div>
  )
}
export const openCreateBook$ = new Subject<string>()
export const CreateBook = observer(() => {
  const dom = useRef<HTMLDivElement>(null)
  const [modal, ctx] = Modal.useModal()
  const [notify, nctx] = notification.useNotification()
  const core = useCoreContext()
  const editorRef = useRef<Ace.Editor>()
  const [state, setState] = useLocalState({
    path: '',
    open: false,
    submitting: false,
    ready: false,
    published: false,
    id: '',
    deleteSettingsFile: false
  })
  const getDocByFolder = useCallback(async (dir: string) => {
    const tree: DataTree[] = []
    const files = await readdir(dir)
    for (const name of files) {
      if (name.startsWith('.') || name.toLocaleLowerCase() === 'node_modules') {
        continue
      }
      const path = join(dir, name)
      const stat = statSync(path)
      if (stat.isDirectory()) {
        tree.push({
          name,
          realPath: path,
          children: await getDocByFolder(path)
        })
      } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
        core.pb.curDocPath = path
        const md = await window.api.fs.readFile(path, { encoding: 'utf-8' })
        tree.push({
          name,
          realPath: path,
          md
        })
      }
    }
    return sortTree(tree)
  }, [])
  const getDocBySettings = useCallback(async (docs: any[], dir: string) => {
    const tree: DataTree[] = []
    for (const item of docs) {
      if (item.path && (item.path.endsWith('.md') || item.path.endsWith('.markdown'))) {
      const path = join(dir, item.path.replace(/^\/+/, ''))
        const stat = window.api.stat(path)
        if (!stat) {
          core.message.warning(`The path ${item.path} does not exist`)
          throw new Error()
        }
        core.pb.curDocPath = path
        tree.push({
          name: item.name,
          realPath: path,
          md: await window.api.fs.readFile(path, { encoding: 'utf-8' })
        })
      } else if (item.children) {
        tree.push({
          name: item.name,
          children: await getDocBySettings(item.children, dir)
        })
      }
    }
    return tree
  }, [])
  const check = useCallback(async (code: string) => {
    try {
      const settings = JSON.parse(code)
      if (settings.id) {
        const book = await core.pb.api?.getBook(settings.id)
        if (book) {
          setState({ published: true, id: book.id })
        }
      }
    } finally {
      setState({ ready: true })
    }
  }, [])

  const close = useCallback(() => {
    setState({ open: false, path: '', id: '', deleteSettingsFile: false })
    setTimeout(() => {
      setState({ ready: false, published: false })
    }, 300)
    editorRef.current?.destroy()
  }, [])
  useSubject(openCreateBook$, (path) => {
    setState({ path, open: true })
    setTimeout(async () => {
      const editor = (editorRef.current = ace.edit(dom.current!, {
        useWorker: false,
        value: '',
        fontSize: 13,
        wrap: 'off',
        tabSize: 2,
        maxPixelHeight: 400,
        showPrintMargin: false
      }))
      if (core.config.config.dark) {
        editor.setTheme(`ace/theme/cloud9_night`)
      } else {
        editor.setTheme('ace/theme/cloud_editor')
      }
      editor.session.setMode(`ace/mode/json`)
      try {
        const json = await window.api.fs.readFile(join(path, '.inkdown/settings.json'), {
          encoding: 'utf-8'
        })
        editor.setValue(json)
        check(json)
      } catch (e) {
        console.error(e)
        editor.setValue(JSON.stringify({ id: 'Unique ID', name: 'Book Name' }, null, 2))
        setState({ ready: true })
      }
      EditorUtils.focusAceEnd(editor)
    }, 100)
  })
  const sync = useCallback(
    async (data: { tree: DataTree[]; id: string; name: string; settings: Record<string, any> }) => {
      const id = await core.pb.api?.syncBook({
        data: data.tree,
        id: data.id,
        name: data.name,
        settings: data.settings
      })
      setState({ id, published: true })
      const key = nanoid()
      notify.success({
        key,
        message: core.config.zh ? '同步成功' : 'Synchronization succeeded',
        duration: 3,
        btn: (
          <Space>
            <Button
              onClick={() => {
                notify.destroy(key)
              }}
            >
              {'Close'}
            </Button>
            <Button
              type={'primary'}
              onClick={() => {
                window.open(`${core.pb.host}/doc/${id}`)
                notify.destroy(key)
              }}
            >
              {'Open'}
            </Button>
          </Space>
        )
      })
    },
    []
  )
  const publish = useCallback(async () => {
    try {
      const code = editorRef.current?.getValue()!
      const settings = JSON.parse(code)
      if (!settings.id) {
        core.message.warning('Please fill in the id field')
        return
      }
      if (!settings.name) {
        core.message.warning('Please fill in the name field')
        return
      }
      let tree:DataTree[] = []
      if (settings.docs instanceof Array) {
        tree = await getDocBySettings(settings.docs, state.path)
      } else {
        tree = await getDocByFolder(state.path)
      }
      setState({ submitting: true })
      if (!window.api.stat(join(state.path, '.inkdown'))) {
        await window.api.fs.mkdir(join(state.path, '.inkdown'))
      }
      await window.api.fs.writeFile(join(state.path, '.inkdown/settings.json'), code, {
        encoding: 'utf-8'
      })
      const book = await core.pb.api?.getBook(settings.id)
      if (book) {
        modal.confirm({
          title: 'Note',
          content: `Book id "${settings.id}" already exists. Do you want to overwrite the content?`,
          onOk: async () => {
            try {
              await sync({
                tree,
                id: settings.id,
                name: settings.name,
                settings: {
                  nav: settings.nav
                }
              })
            } catch (e: any) {
              console.error(e)
              core.message.warning(e.message)
            }
          }
        })
      } else {
        await sync({
          tree,
          id: settings.id,
          name: settings.name,
          settings: {
            nav: settings.nav
          }
        })
      }
    } catch (e: any) {
      if (e?.message) {
        console.error(e)
        core.message.warning(e.message)
      }
    } finally {
      setState({ submitting: false })
    }
  }, [])
  const unpublish = useCallback(() => {
    modal.confirm({
      title: 'Note',
      content: <DeleteSettingsFile onChange={check => setState({deleteSettingsFile: check})}/>,
      okButtonProps: { danger: true },
      onOk: async () => {
        await core.pb.api?.deleteBook(state.id)
        if (state.deleteSettingsFile) {
          try {
            window.api.fs.rm(join(state.path, '.inkdown'), {recursive: true, force: true})
            editorRef.current?.setValue(JSON.stringify({ id: 'Unique ID', name: 'Book Name' }, null, 2))
            EditorUtils.focusAceEnd(editorRef.current!)
          } catch(e) {}
        }
        setState({ published: false, id: '', deleteSettingsFile: false })
      },
      onCancel: () => {
        setState({deleteSettingsFile: false})
      }
    })
  }, [])
  return (
    <Modal
      title={'Create Book'}
      width={700}
      open={state.open}
      footer={null}
      forceRender={true}
      onCancel={close}
    >
      {ctx}
      {nctx}
      <div className={'text-sm dark:text-white/60 mb-2'}>
        Fill in the settings file,{' '}
        <a className={'underline hover:underline text-blue-500'}>details</a>.
      </div>
      <div className={'border rounded-sm dark:border-white/10 border-black/10 py-2'}>
        <div style={{ lineHeight: '22px', height: 300 }} ref={dom}></div>
      </div>
      <div className={'flex justify-end mt-3 space-x-2'}>
        {state.ready && (
          <>
            <Button onClick={close}>Cancel</Button>
            {state.published && (
              <Button danger={true} onClick={unpublish}>
                Unpublish
              </Button>
            )}
            <Button type={'primary'} onClick={publish}>
              Publish
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
})
