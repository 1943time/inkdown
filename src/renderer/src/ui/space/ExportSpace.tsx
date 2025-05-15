import { Button, Modal, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { ExportOutlined } from '@ant-design/icons'
import { useStore } from '@/store/store'
import { FolderDown } from 'lucide-react'
import { useLocalState } from '@/hooks/useLocalState'
import { Trans, useTranslation } from 'react-i18next'

export const ExportSpace = observer(() => {
  const store = useStore()
  const { t } = useTranslation()
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
      maskClosable={!state.loading}
      onCancel={() => store.note.setState({ openExportSpace: false })}
      width={420}
    >
      <div className={'text-sm text-black/80 dark:text-white/80 mt-3'}>
        <Trans
          i18nKey={'export.description'}
          components={{
            tag: <Tag />
          }}
        />
      </div>
      <Button
        block={true}
        type={'primary'}
        className={'mt-5'}
        loading={state.loading}
        icon={<ExportOutlined />}
        onClick={() => {
          store.local.chooseLocalFolder().then((path) => {
            if (path.filePaths.length) {
              setState({ loading: true })
              store.local.manualWritePath = path.filePaths[0]
              store.local
                .initialRewrite(store.note.state.nodes, true)
                .then(() => {
                  store.msg.success(t('export.fileWritten'))
                  store.system.showInFinder(window.api.path.join(path.filePaths[0]))
                })
                .finally(() => {
                  store.local.manualWritePath = null
                  setState({ loading: false })
                })
            }
          })
        }}
      >
        {state.loading ? t('export.exporting') : t('export.selectFolder')}
      </Button>
    </Modal>
  )
})
