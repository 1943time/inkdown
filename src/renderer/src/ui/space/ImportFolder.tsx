import { observer } from 'mobx-react-lite'
import { Button, Modal, Table, Tag } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useRef } from 'react'
import { useLocalState } from '../../hooks/useLocalState.ts'
import { Icon } from '@iconify/react'
import { sizeUnit } from '../../utils'
import { useCoreContext } from '../../utils/env.ts'
import { ImportTree } from '../../store/logic/local.ts'
import { Subject } from 'rxjs'
import { useSubject } from '../../hooks/subscribe.ts'
import { IImport } from '../../icons/IImport.tsx'

export const openImportFolder$ = new Subject<null | string>()
export const ImportFolder = observer(() => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    loading: false,
    tree: [] as ImportTree[],
    imageTotalSize: 0,
    imageTotal: 0,
    docTotal: 0,
    open: false,
    parentCid: null as null | string
  })
  useSubject(openImportFolder$, (cid) => {
    setState({ tree: [], imageTotal: 0, imageTotalSize: 0, parentCid: cid, open: true })
  })
  const dataCache = useRef<{
    insertImages: { cid: string; file: File }[]
    tree: ImportTree[]
  }>()
  const selectFolder = useCallback(async () => {
    try {
      const res = await core.import.importFolder(state.parentCid ? state.parentCid : undefined)
      if (res) {
        dataCache.current = res
        setState({
          imageTotal: res.insertImages.length,
          imageTotalSize: res.insertImages.reduce((a, b) => a + b.file.size, 0),
          tree: res.tree,
          docTotal: res.docCount
        })
      }
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
          {core.config.zh ? '导入文件夹' : 'Import'} <IImport className={'ml-2 text-lg'} />
        </div>
      }
    >
      {!state.tree.length && (
        <>
          <div className={'text-sm text-black/80 dark:text-white/80 my-2'}>
            Import markdown documents into the
            <Tag className={'ml-1.5'} color={'pink'}>
              {state.parentCid
                ? `${core.tree.nodeMap.get(state.parentCid!)?.name || 'root'}`
                : 'current workspace'}
            </Tag>
            in batches. Inkdown will automatically convert file path links and dependent images.
          </div>
          <Button
            type={`primary`}
            block={true}
            className={'mt-4'}
            icon={<FolderOpenOutlined />}
            loading={state.loading}
            onClick={selectFolder}
          >
            {core.config.zh ? '打开文件夹' : 'Open Folder'}
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
                    <span>Import Files:</span>
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
                      <span className={'text-gray-500 dark:text-gray-400'}>Size:</span>
                      <span className={'text-sm text-gray-600 dark:text-gray-300 font-normal'}>
                        {sizeUnit(state.imageTotalSize)}
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
            Existing file paths will be ignored
          </div>
          <div className={'flex space-x-4 mt-2'}>
            <Button block={true} onClick={() => setState({ open: false })} disabled={state.loading}>
              Cancel
            </Button>
            <Button
              type={'primary'}
              block={true}
              loading={state.loading}
              onClick={async () => {
                setState({ loading: true })
                try {
                  await core.api.checkQuota
                    .mutate({
                      docs: state.docTotal,
                      fileSize: state.imageTotalSize
                    })
                    .catch(core.pay.catchLimit())
                  await core.import
                    .insertFiles({
                      insertImages: dataCache.current?.insertImages || [],
                      tree: dataCache.current?.tree || [],
                      spaceCid: core.tree.root.cid
                    })
                    .then(() => {
                      setState({ open: false })
                      core.service.initialOffline(core.tree.root.cid)
                    })
                } finally {
                  setState({ loading: false })
                }
              }}
            >
              Import
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
})
