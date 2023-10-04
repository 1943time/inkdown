import {observer} from 'mobx-react-lite'
import {Modal, Tabs} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {IShareNote} from '../store/db'

export const Record = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    docs: [] as IShareNote[]
  })
  return (
    <Modal
      width={900}
      open={props.open}
      title={'Records'}
      onCancel={props.onClose}
      footer={null}
    >
      <Tabs
        size={'small'}
        tabPosition={'left'}
        items={[
          {
            label: 'Notes',
            key: 'note',
            children: (
              <></>
            )
          },
          {
            label: 'Files',
            key: 'file',
            children: (
              <></>
            )
          }
        ]}
      />
    </Modal>
  )
})
