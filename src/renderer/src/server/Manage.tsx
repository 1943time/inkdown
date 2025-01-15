import { Modal, Tabs } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCoreContext } from '../store/core'
import { Book } from './Book'
import { Settings } from './Settings'
import { useLocalState } from '../hooks/useLocalState'
export const PbManage = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    activeKey: 'books'
  })
  return (
    <Modal
      title={'Publish'}
      width={900}
      open={props.open}
      onCancel={props.onClose}
      footer={null}
    >
      <Tabs
        size={'small'}
        activeKey={state.activeKey}
        onTabClick={e => {
          setState({activeKey: e})
        }}
        items={[
          {
            label: 'Book',
            key: 'books',
            forceRender: true,
            children: <Book visible={state.activeKey === 'books'}/>
          },
          {
            label: 'Server',
            key: 'server',
            children: <Settings/>
          }
        ]}
      />
    </Modal>
  )
})
