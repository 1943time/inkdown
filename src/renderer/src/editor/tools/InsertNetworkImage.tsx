import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Input, Modal} from 'antd'
import {useEditorStore} from '../store'
import {action, runInAction} from 'mobx'
import {useLocalState} from '../../hooks/useLocalState'
import {ReactEditor} from 'slate-react'
import isHotkey from 'is-hotkey'
import {useCallback, useEffect} from 'react'
import {mediaType} from '../utils/dom'
import {Editor, Element, Transforms} from 'slate'
import {EditorUtils} from '../utils/editorUtils'
import {getRemoteMediaType} from '../utils/media'
import {message$, nid} from '../../utils'
import {TextHelp} from '../../components/set/Help'

export const InsertNetworkImage = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    url: '',
    loading: false,
    download: false
  })
  const insert = useCallback(async () => {
    setState({loading: true})
    try {
      ReactEditor.focus(store.editor)
      const ext = await getRemoteMediaType(state.url)
      if (!ext) {
        return message$.next({
          type: 'warning',
          content: 'Invalid address'
        })
      }
      if (state.download) {
        const res = await window.api.fetch(state.url, {
          timeout: 20 * 1000
        })
        const buffer = await res.buffer()
        const filePath = await store.saveFile({
          name: nid() + '.' + ext,
          buffer: buffer.buffer
        })
        const path = EditorUtils.findMediaInsertPath(store.editor)
        if (!path) return
        Transforms.insertNodes(store.editor, {
          type: 'media', url: filePath, children: [{text: ''}]
        }, {at: path, select: true})
      } else {
        const type = mediaType('.' + ext)
        if (['image', 'video', 'audio', 'document'].includes(type)) {
          const path = EditorUtils.findMediaInsertPath(store.editor)
          if (!path) return
          Transforms.insertNodes(store.editor, {
            type: 'media', url: state.url, children: [{text: ''}]
          }, {at: path, select: true})
        } else {
          Transforms.insertNodes(store.editor, {
            text: state.url, url: state.url
          }, {select: true})
        }
      }
      setState({url: ''})
      runInAction(() => {
        store.openInsertNetworkImage = false
      })
    } finally {
      setState({loading: false})
    }
  }, [])

  useEffect(() => {
    if (store.openInsertNetworkImage) {
      setState({
        download: false,
        url: ''
      })
    }
  }, [store.openInsertNetworkImage])

  return (
    <Modal
      title={'Insert media file'}
      footer={null}
      width={400}
      open={store.openInsertNetworkImage}
      onCancel={action(() => store.openInsertNetworkImage = false)}
    >
      <Input
        placeholder={'Media url'}
        value={state.url}
        onKeyDown={e => {
          if (isHotkey('enter', e)) {
            insert()
          }
        }}
        onChange={e => setState({url: e.target.value})}
      />
      <div className={'mt-3 flex items-center space-x-1'}>
        <Checkbox checked={state.download} onChange={e => setState({download: e.target.checked})}>Download</Checkbox>
        <TextHelp text={'Download and use local path'}/>
      </div>
      <Button
        type={'primary'} className={'mt-4'} block={true}
        loading={state.loading}
        disabled={!state.url}
        onClick={insert}
      >
        Insert
      </Button>
    </Modal>
  )
})
