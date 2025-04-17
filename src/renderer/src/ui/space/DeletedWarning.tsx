import { Button, Modal } from 'antd'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { useStore } from '@/store/store'

export const DeleteWarning = observer(() => {
  const store = useStore()
  return (
    <Modal
      width={400}
      title={'Reload'}
      open={store.note.state.deleted}
      footer={null}
      closable={false}
    >
      <div className={'text-base mt-4 text-center'}>
        This workspace has been deleted, please reload
      </div>
      <Button
        type={'primary'}
        block={true}
        className={'mt-4'}
        onClick={() => {
          store.note.selectSpace()
        }}
      >
        Reload
      </Button>
    </Modal>
  )
})
