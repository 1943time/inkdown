import { Button, Modal, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { ExportOutlined } from '@ant-design/icons'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState.js'
import { useSubject } from '@/hooks/common'
import { FolderInput } from 'lucide-react'
import { TextHelp } from '../common/HelpText'

export const ExportSpace = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    open: false
  })
  useSubject(store.note.openSpaceExport$, async () => {
    setState({ open: true })
  })
  return (
    <Modal
      title={
        <div className={'flex items-center'}>
          {store.note.state.currentSpace?.name} <FolderInput size={16} className={'ml-2'} />
        </div>
      }
      open={state.open}
      footer={null}
      onCancel={() => setState({ open: false })}
      width={460}
    >
      <div className={'text-sm text-black/80 dark:text-white/80 mt-3'}>
        Export the document in the space to the local computer in standard markdown format. Media
        files will be downloaded one by one into the{' '}
        <Tag color={'blue'} className={'mr-0'}>
          .files
        </Tag>{' '}
        folder with some delay.{' '}
        <TextHelp text={'To ensure writing speed, inkdown only writes attachments within 5MB.'} />
      </div>
      {/* {core.exportSpace.start && (
        <Progress
          percent={core.exportSpace.progress}
          className={'mt-4'}
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068'
          }}
        />
      )} */}
      <Button
        block={true}
        type={'primary'}
        className={'mt-5'}
        icon={<ExportOutlined />}
        // onClick={() => core.exportSpace.export()}
        // disabled={core.exportSpace.start}
      >
        Select Folder
      </Button>
    </Modal>
  )
})
