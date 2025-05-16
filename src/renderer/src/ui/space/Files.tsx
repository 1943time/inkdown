import { getImageData } from '@/editor/utils'
import { useLocalState } from '@/hooks/useLocalState'
import { useStore } from '@/store/store'
import { Button, Modal } from '@lobehub/ui'
import { Popconfirm } from 'antd'
import { Download, TicketSlash } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IFile } from 'types/model'

export const SpaceFiles = observer(() => {
  const { t } = useTranslation()
  const store = useStore()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 30,
    files: [] as IFile[],
    loading: false,
    assetsPath: '',
    loadEnd: false
  })
  const getFiles = useCallback(
    (fore = false) => {
      setState({ loading: true })
      store.model
        .getFiles({
          spaceId: store.note.state.currentSpace?.id!,
          page: state.page,
          pageSize: state.pageSize
        })
        .then((res) => {
          setState({
            files: fore ? res : [...state.files, ...res],
            loadEnd: res.length < state.pageSize
          })
        })
        .finally(() => {
          setState({ loading: false })
        })
    },
    [store.note.state.currentSpace?.id]
  )

  const clearAttachFiles = useCallback(async () => {
    return store.model.clearAttachFiles(store.note.state.currentSpace?.id!).then(() => {
      setState({
        page: 1,
        loadEnd: false
      })
      getFiles(true)
    })
  }, [store.note.state.currentSpace?.id])
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 50 && !state.loading && !state.loadEnd) {
        setState({ page: state.page + 1 })
        getFiles()
      }
    },
    [getFiles]
  )
  const downLoad = useCallback(async (path: string) => {
    const res = await store.system.showSaveDialog({
      filters: [{ name: '图片', extensions: [window.api.path.extname(path).replace('.', '')] }]
    })
    if (res.filePath) {
      await window.api.fs.cp(path, res.filePath)
      store.system.showInFinder(res.filePath)
    }
  }, [])
  useEffect(() => {
    if (store.note.state.openSpaceFiles) {
      store.system.getAssetsPath().then((path) => setState({ assetsPath: path }))
      setState({
        page: 1,
        loadEnd: false,
        files: []
      })
      getFiles()
    }
  }, [store.note.state.openSpaceFiles])

  return (
    <Modal
      title={
        <div className={'flex items-center'}>
          <span>{t('spaceFiles.title')}</span>
          <Popconfirm
            title={t('spaceFiles.clearUnused')}
            placement={'bottom'}
            onConfirm={clearAttachFiles}
          >
            <Button
              icon={<TicketSlash size={18} />}
              type={'text'}
              size={'small'}
              className={'ml-2'}
            />
          </Popconfirm>
        </div>
      }
      width={740}
      footer={null}
      open={store.note.state.openSpaceFiles}
      onCancel={() => {
        store.note.setState({
          openSpaceFiles: false
        })
      }}
    >
      <div
        className={'flex flex-wrap space-x-3 max-h-[400px] overflow-y-auto'}
        onScroll={handleScroll}
      >
        {state.files.map((f) => (
          <div className={'w-32 h-32 rounded-md overflow-hidden relative group'} key={f.name}>
            <img
              src={getImageData(window.api.path.join(state.assetsPath, f.name))}
              alt={'space'}
              className={'w-full h-full object-cover mb-2'}
            />
            <div
              className={
                'absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 duration-150 group-hover:opacity-100'
              }
            >
              <Button
                type={'primary'}
                icon={<Download size={16} />}
                size={'small'}
                onClick={() => {
                  downLoad(window.api.path.join(state.assetsPath, f.name))
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {!state.files.length && (
        <div className={'py-5 dark:text-white/50 text-black/50 text-sm text-center'}>
          {t('spaceFiles.noFiles')}
        </div>
      )}
    </Modal>
  )
})
