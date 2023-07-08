import {observer} from 'mobx-react-lite'
import {Button, Modal, Table, Tabs} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {Book, db} from './db'
import {MainApi} from '../api/main'
import {extname} from 'path'
import {message$} from '../utils'
import {configStore} from '../store/config'

export const removeBook = async (id: number) => {
  const chapters = await db.chapter.where('bookId').equals(id).toArray()
  const book = await db.book.get(id)
  const sdk = new window.api.sdk()
  if (book) {
    await db.book.delete(book.id!)
    await db.chapter.where('bookId').equals(id).delete()
    await sdk.removeFile(`books/${book.path}/map.json`)
    await sdk.removeFile(`books/${book.path}/text.json`)
    if (chapters.length) {
      for (let c of chapters) {
        await sdk.removeFile(`books/${book.path}/${c.path}.json`)
      }
    }
    try {
      await sdk.removeFile(`books/${book.path}`)
    } catch (e) {
      console.log(`remove dir fail ${book.path}`)
    }
  }
}

export const Record = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [modal, contextHolder] = Modal.useModal()
  const [state, setState] = useLocalState({
    activeKey: 'doc',
    docs: [] as any[],
    files: [] as any[],
    books: [] as Book[],
    bookPage: 1,
    docPage: 1,
    filePage: 1,
    config: null as any
  })
  const getDocs = useCallback(async () => {
    const data = await db.doc.offset((state.docPage - 1) * 15).limit(15).toArray()
    setState({docs: data})
  }, [])

  const getFiles = useCallback(async () => {
    const data = await db.file.offset((state.filePage - 1) * 15).limit(15).toArray()
    setState({files: data})
  }, [])

  const getBooks = useCallback(async () => {
    const data = await db.book.offset((state.bookPage - 1) * 15).limit(15).toArray()
    setState({books: data})
  }, [])

  useEffect(() => {
    if (props.open) {
      setState({docPage: 1, filePage: 1})
      if (state.activeKey === 'doc') getDocs()
      if (state.activeKey === 'file') getFiles()
      if (state.activeKey === 'book') getBooks()
      MainApi.getServerConfig().then(res => setState({config: res}))
    }
  }, [props.open])
  return (
    <Modal
      title={configStore.isZh ? '分享记录' : 'Share Records'}
      width={900}
      open={props.open}
      onCancel={props.onClose}
      footer={null}
    >
      {contextHolder}
      <Tabs
        tabPosition={'left'}
        activeKey={state.activeKey}
        onChange={k => {
          setState({activeKey: k})
          if (k === 'file' && !state.files.length) getFiles()
          if (k === 'doc' && !state.docs.length) getDocs()
          if (k === 'book' && !state.books.length) getBooks()
        }}
        items={[
          {
            key: 'doc',
            label: configStore.isZh ? '分享文档' : 'Share documents',
            children: (
              <div>
                <Table
                  size={'small'}
                  dataSource={state.docs}
                  rowKey={'id'}
                  pagination={{
                    pageSize: 15,
                    current: state.docPage,
                    onChange: page => {
                      setState({docPage: page})
                      getDocs()
                    }
                  }}
                  columns={[
                    {
                      title: configStore.isZh ? '名称' : 'Name',
                      dataIndex: 'name',
                      render: (v, record) => (
                        <a
                          className={'text-blue-500'}
                          onClick={() => window.open(`${state.config?.domain}/docs/${record.id}.html`)}
                        >{v}</a>
                      )
                    },
                    {
                      title: configStore.isZh ? '文件路径' : 'File path',
                      dataIndex: 'filePath'
                    },
                    {
                      title: configStore.isZh ? '更新时间' : 'Updated',
                      dataIndex: 'updated'
                    },
                    {
                      title: configStore.isZh ? '删除' : 'Delete',
                      key: 'handle',
                      render: (v, record) => (
                        <Button
                          size={'small'} danger type={'link'}
                          onClick={() => {
                            modal.confirm({
                              title: configStore.isZh ?'提示' : 'Prompt',
                              content: configStore.isZh ? '将同时删除远程文件，点击确认删除' : 'The remote file will be deleted at the same time, click Confirm Delete',
                              onOk: async () => {
                                const sdk = new window.api.sdk()
                                await sdk.removeFile('docs/' + record.id + '.html')
                                sdk.dispose()
                                await db.doc.delete(record.id)
                                message$.next({type: 'success', content: configStore.isZh ? '删除成功' : 'Deletion was successful'})
                                getDocs()
                              }
                            })
                          }}
                        >
                          {configStore.isZh ? '删除' : 'Delete'}
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'book',
            label: configStore ? '电子书' : 'eBook',
            children: (
              <div>
                <Table
                  size={'small'}
                  dataSource={state.books}
                  rowKey={'id'}
                  pagination={{
                    pageSize: 15,
                    current: state.bookPage,
                    onChange: page => {
                      setState({bookPage: page})
                      getBooks()
                    }
                  }}
                  columns={[
                    {
                      title: configStore.isZh ? '名称' : 'Name',
                      dataIndex: 'name',
                      render: (v, record) => (
                        <a
                          className={'text-blue-500'}
                          onClick={() => window.open(`${state.config?.domain}/book/${record.path}`)}
                        >{v}</a>
                      )
                    },
                    {
                      title: configStore.isZh ? '文件路径' : 'FilePath',
                      dataIndex: 'filePath'
                    },
                    {
                      title: configStore.isZh ? '同步策略' : 'Policy',
                      dataIndex: 'strategy',
                      render: v => v === 'auto' ? (configStore.isZh ? '自动生成' : 'Auto') : (configStore.isZh ? '自定义' : 'Custom')
                    },
                    {
                      title: configStore.isZh ? '更新时间' : 'Updated',
                      dataIndex: 'updated'
                    },
                    {
                      title: configStore.isZh ? '删除' : 'Delete',
                      key: 'handle',
                      render: (v, record) => (
                        <Button
                          size={'small'} danger type={'link'}
                          onClick={() => {
                            modal.confirm({
                              title: configStore.isZh ? '提示' : 'Prompt',
                              content: configStore.isZh ? '将同时删除远程文件与所有章节，点击确认删除' : 'The remote file and all chapters will be deleted at the same time, click Confirm Delete',
                              onOk: async () => {
                                return removeBook(record.id!).then(() => {
                                  message$.next({type: 'success', content: configStore.isZh ? '删除成功' : 'Deletion was successful'})
                                  getBooks()
                                })
                              }
                            })
                          }}
                        >
                          {configStore.isZh ? '删除' : 'Delete'}
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'file',
            label: configStore.isZh ? '同步文件' : 'Synced files',
            children: (
              <div>
                <Table
                  size={'small'}
                  dataSource={state.files}
                  rowKey={'id'}
                  pagination={{
                    pageSize: 15,
                    current: state.filePage,
                    onChange: page => {
                      setState({filePage: page})
                      getFiles()
                    }
                  }}
                  columns={[
                    {
                      title: configStore.isZh ? '打开' : 'Open',
                      dataIndex: 'hash',
                      render: (v, record) => (
                        <a
                          className={'text-blue-500'}
                          onClick={() => window.open(`${state.config?.domain}/files/${record.hash}${extname(record.filePath)}`)}
                        >打开</a>
                      )
                    },
                    {
                      title: configStore.isZh ? '文件路径' : 'File Path',
                      dataIndex: 'filePath'
                    },
                    {
                      title: configStore.isZh ? '删除' : 'Delete',
                      key: 'handle',
                      render: (v, record) => (
                        <Button
                          size={'small'} danger type={'link'}
                          onClick={() => {
                            modal.confirm({
                              title: configStore.isZh ? '提示' : 'Prompt',
                              content: configStore.isZh ? '将同时删除远程文件，点击确认删除' : 'The remote file will be deleted at the same time, click Confirm Delete',
                              onOk: async () => {
                                const sdk = new window.api.sdk()
                                await sdk.removeFile('files/' + record.hash + extname(record.filePath))
                                sdk.dispose()
                                await db.file.delete(record.id)
                                getFiles()
                              }
                            })
                          }}
                        >
                          {configStore.isZh ? '删除' : 'Delete'}
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )
          }
        ]}
      />
    </Modal>
  )
})
