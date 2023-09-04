import {observer} from 'mobx-react-lite'
import {Button, Input, Modal} from 'antd'
import {useEditorStore} from '../store'
import {action, runInAction} from 'mobx'
import {useLocalState} from '../../hooks/useLocalState'
import {ReactEditor} from 'slate-react'
import isHotkey from 'is-hotkey'
import {useCallback} from 'react'

export const InsertNetworkImage = observer(() => {
  const store = useEditorStore()
  const [state, setState] = useLocalState({
    url: ''
  })
  const insert = useCallback(() => {
    runInAction(() => {
      store.openInsertNetworkImage = false
    })
    ReactEditor.focus(store.editor)
    setTimeout(() => {
      store.insertInlineNode(state.url)
      setState({url: ''})
    })
  }, [])
  return (
    <Modal
      title={'Insert image via url'}
      footer={null}
      width={400}
      open={store.openInsertNetworkImage}
      onCancel={action(() => store.openInsertNetworkImage = false)}
    >
      <Input
        placeholder={'Enter image url'}
        value={state.url}
        onKeyDown={e => {
          if (isHotkey('enter', e)) {
            insert()
          }
        }}
        onChange={e => setState({url: e.target.value})}
      />
      <Button
        type={'primary'} className={'mt-4'} block={true}
        disabled={!state.url}
        onClick={insert}
      >
        Insert
      </Button>
    </Modal>
  )
})
