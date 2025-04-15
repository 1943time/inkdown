import { Button, Modal } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCoreContext } from '../../utils/env.ts'
import { runInAction } from 'mobx'

export const DeleteWarning = observer(() => {
  const core = useCoreContext()
  return (
    <Modal width={400} title={'Reload'} open={core.tree.deleted} footer={null} closable={false}>
      <div className={'text-base mt-4 text-center'}>This workspace has been deleted, please reload</div>
      <Button
        type={'primary'} block={true} className={'mt-4'}
        onClick={() => {
          core.service.initial()
          runInAction(() => {
            core.tree.deleted = false
          })
        }}
      >
        Reload
      </Button>
    </Modal>
  )
})
