import { Button, Modal, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { ExportOutlined } from '@ant-design/icons'
import { useStore } from '@/store/store'
import { FolderDown } from 'lucide-react'
import { useLocalState } from '@/hooks/useLocalState'

export const ExportSpace = observer(() => {
  const store = useStore()
  const [state, setState] = useLocalState({
    loading: false
  })
  return (
    <Modal
      title={
        <div className={'flex items-center'}>
          {store.note.state.currentSpace?.name} <FolderDown size={16} className={'ml-2'} />
        </div>
      }
      open={store.note.state.openExportSpace}
      footer={null}
      onCancel={() => store.note.setState({ openExportSpace: false })}
      width={420}
    >
      <div className={'text-sm text-black/80 dark:text-white/80 mt-3'}>
        Inkdown将以 <Tag>GitHub Flavored Markdown Spec</Tag>格式导出至本机文件夹。 文件附件将保存至{' '}
        <Tag>.files</Tag> 文件夹中。
      </div>
      <Button
        block={true}
        type={'primary'}
        className={'mt-5'}
        loading={state.loading}
        icon={<ExportOutlined />}
        onClick={() => {
          setState({ loading: true })
          store.local.chooseLocalFolder().then((path) => {
            if (path.filePaths.length) {
              store.local.manualWritePath = path.filePaths[0]
              store.local
                .initialRewrite(store.note.state.nodes, true)
                .then(() => {
                  store.msg.success('文件已写入。')
                  window.api.fs.showInFinder(window.api.path.join(path.filePaths[0]))
                })
                .finally(() => {
                  store.local.manualWritePath = null
                  setState({ loading: false })
                })
            }
          })
        }}
      >
        {state.loading ? '正在导出...' : '选择文件夹'}
      </Button>
    </Modal>
  )
})
