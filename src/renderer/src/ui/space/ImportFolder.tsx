import { observer } from 'mobx-react-lite'
import { Button, Modal, Table, Tag } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useCallback } from 'react'
import { Icon } from '@iconify/react'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState'
import { useSubject } from '@/hooks/common.js'
import { FolderInput } from 'lucide-react'
import { IDoc } from 'types/model'
import { useTranslation } from 'react-i18next'

export const ImportFolder = observer(() => {
  const { t } = useTranslation()
  const store = useStore()
  const [state, setState] = useLocalState({
    loading: false,
    tree: [] as (IDoc & { path: string; isset: boolean })[],
    imageTotal: 0,
    open: false,
    docTotal: 0,
    parent: null as null | IDoc
  })
  useSubject(store.note.openImportFolder$, (id) => {
    setState({
      open: true,
      parent: store.note.state.nodes[id || 'root'],
      tree: []
    })
  })
  const selectFolder = useCallback(async () => {
    try {
      const res = await store.import.importFolder(state.parent)
      setState({
        tree: res?.tree || [],
        docTotal: res?.docs || 0,
        imageTotal: res?.images || 0
      })
    } catch (e) {
      console.error(e)
    } finally {
      setState({ loading: false })
    }
  }, [])
  const insert = useCallback(async () => {
    try {
      setState({ loading: true })
      await store.import.insertFiles()
      store.msg.success(t('importFolder.success'))
      setState({ open: false })
    } catch (e) {
      console.error(e)
    } finally {
      setState({ loading: false })
    }
  }, [])
  return (
    <Modal
      open={state.open}
      onCancel={() => {
        if (!state.loading) {
          setState({ open: false })
        }
      }}
      width={460}
      closable={!state.loading}
      footer={null}
      title={
        <div className={'flex items-center'}>
          {t('importFolder.import')} <FolderInput className={'ml-2'} size={16} />
        </div>
      }
    >
      {!state.tree.length && (
        <>
          <div className={'text-sm text-black/80 dark:text-white/80 my-2'}>
            {t('importFolder.batchImport')}
            <Tag className={'ml-2'} color={'pink'}>
              {state.parent?.name || t('importFolder.currentWorkspace')}
            </Tag>
            {t('importFolder.autoConvert')}
          </div>
          <Button
            type={`primary`}
            block={true}
            className={'mt-4'}
            icon={<FolderOpenOutlined />}
            loading={state.loading}
            onClick={selectFolder}
          >
            {t('importFolder.openFolder')}
          </Button>
        </>
      )}

      {!!state.tree.length && (
        <>
          <Table
            dataSource={state.tree}
            rowKey={'path'}
            pagination={false}
            scroll={{ y: 300 }}
            size={'small'}
            columns={[
              {
                title: (
                  <div className={'flex items-center'}>
                    <span>{t('importFolder.importFiles')}</span>
                    <div className={'flex items-center space-x-0.5 ml-2'}>
                      <Icon icon={'f7:doc-text'} className={'text-blue-500'} />
                      <span className={'text-gray-600 dark:text-gray-300 textsm font-normal'}>
                        {state.docTotal}
                      </span>
                    </div>
                    <div className={'flex items-center space-x-1 ml-3'}>
                      <Icon icon={'ri:image-line'} className={'text-amber-500'} />
                      <span className={'text-sm text-gray-600 dark:text-gray-300 font-normal'}>
                        {state.imageTotal}
                      </span>
                    </div>
                  </div>
                ),
                dataIndex: 'name',
                render: (v: string, record) => (
                  <span
                    className={`${record.isset && !record.folder ? 'dark:text-white/50 text-black/50' : ''}`}
                  >
                    {v}
                  </span>
                )
              }
            ]}
          />
          <div className={'mt-4 text-sm text-black/60 dark:text-white/60'}>
            {t('importFolder.existingIgnored')}
          </div>
          <div className={'flex space-x-4 mt-2'}>
            <Button block={true} onClick={() => setState({ open: false })} disabled={state.loading}>
              {t('importFolder.cancel')}
            </Button>
            <Button type={'primary'} block={true} loading={state.loading} onClick={insert}>
              {t('importFolder.importAction')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
})
