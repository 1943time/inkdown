import {observer} from 'mobx-react-lite'
import {Button, Modal, Pagination, Table, Tabs, Tooltip} from 'antd'
import {useCallback, useEffect} from 'react'
import dayjs from 'dayjs'
import {
  CloudUploadOutlined, FileTextOutlined,
  LockOutlined,
  QuestionCircleOutlined,
  StopOutlined, SyncOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import {action, runInAction} from 'mobx'
// import {sizeUnit} from '../utils'
import {basename} from 'path'
// import {Book} from './Ebook'
import {default as BookIcon} from '../../icons/IBook'
import {act} from 'react-dom/test-utils'
import {IBook, IDoc, IFile} from '../model'
import {useLocalState} from '../../hooks/useLocalState'
import {shareStore} from '../store'
import {treeStore} from '../../store/tree'
import {shareSuccess$} from '../Share'
import {CancelLock, Lock} from './Lock'
import {CloseShare} from './CloseShare'
import {sizeUnit} from '../../utils'

const Sync = observer((props: {
  doc?: IDoc
  book?: IBook
}) => {
  const [state, setState] = useLocalState({
    syncing: false
  })
  const syncDoc = useCallback(async () => {
    setState({syncing: true})
    try {
      if (props.doc) {
        const res = await shareStore.shareDoc(props.doc.filePath)
        shareSuccess$.next(`${shareStore.serviceConfig!.domain}/doc/${res.name}`)
      }
      if (props.book) {
        await shareStore.shareBook({
          ...props.book,
          name: ''
        })
        shareSuccess$.next(`${shareStore.serviceConfig!.domain}/book/${props.book.path}`)
      }
    } finally {
      setState({syncing: false})
    }
  }, [])
  return (
    <Button
      type={'link'} size={'small'}
      loading={state.syncing}
      onClick={() => syncDoc()}
      icon={<SyncOutlined/>}
    />
  )
})

export const ShareData = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [modal, contextHolder] = Modal.useModal()
  const [state, setState] = useLocalState({
    activeKey: 'doc' as 'doc' | 'book' | 'file',
    docs: [] as IDoc[],
    docTotal: 0,
    books: [] as IBook[],
    bookTotal: 0,
    bookPage: 1,
    docPage: 1,
    filePage: 1,
    files: [] as IFile[],
    fileTotal: 0,
    fileTotalSize: 0,
    loading: false
  })
  const getDocs = useCallback( () => {
    setState({loading: true})
    shareStore.api.getDocs({
      page: state.docPage,
      pageSize: 10
    }).then(res => {
      setState({docs: res.list, docTotal: res.count})
    }).finally(() => setState({loading: false}))
  }, [])

  const getBooks = useCallback( () => {
    setState({loading: true})
    shareStore.api.getBooks().then(res => {
      setState({books: res.list, bookTotal: res.count})
    }).finally(() => setState({loading: false}))
  }, [])

  const getFiles = useCallback( () => {
    setState({loading: true})
    shareStore.api.getFiles({
      page: state.filePage,
      pageSize: 10
    }).then(res => {
      setState({files: res.list})
    }).finally(() => setState({loading: false}))
  }, [])

  const getFileData = useCallback(() => {
    shareStore.api.getFileData().then(res => {
      setState({fileTotal: res.total, fileTotalSize: res.size})
    })
  }, [])

  useEffect(() => {
    if (props.open) {
      setState({
        docPage: 1,
        docs: [],
        docTotal: 0,
        bookPage: 1,
        bookTotal: 0,
        books: [],
        filePage: 1,
        files: [],
        fileTotal: 0,
        fileTotalSize: 0
      })
      if (state.activeKey === 'doc') {
        const docs = Array.from(shareStore.docMap).map(item => item[1])
        setState({docs, docPage: 1})
        getDocs()
      }
      if (state.activeKey === 'book') getBooks()
      if (state.activeKey === 'file') {
        getFiles()
        getFileData()
      }
    }
  }, [props.open])
  return (
    <Modal
      title={'Share Records'}
      width={1000}
      open={props.open}
      onCancel={props.onClose}
      footer={null}
    >
      {contextHolder}
      <div className={'min-h-[260px]'}>
        <Tabs
          activeKey={state.activeKey}
          size={'small'}
          onTabClick={key => {
            setState({activeKey: key as any})
            if (key === 'doc' && !state.docs.length) {
              setState({docPage: 1})
              getDocs()
            }
            if (key === 'book' && !state.books.length) getBooks()
            if (key === 'file' && !state.files.length) {
              getFiles()
              getFileData()
            }
          }}
          items={[
            {
              key: 'doc',
              label: 'Share Note',
              children: (
                <div>
                  <Table
                    size={'small'}
                    dataSource={state.docs}
                    rowKey={'id'}
                    loading={state.loading}
                    pagination={{
                      pageSize: 10,
                      current: state.docPage,
                      total: state.docTotal,
                      onChange: page => {
                        setState({docPage: page})
                        getDocs()
                      }
                    }}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (v, record) => (
                          <>
                            <a
                              className={'link'}
                              target={'_blank'}
                              href={`${shareStore.serviceConfig!.domain}/doc/${v}`}
                            >{v}</a>
                          </>
                        )
                      },
                      {
                        title: 'Filepath',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
                          </Tooltip>
                        )
                      },
                      {
                        title: 'Views',
                        dataIndex: 'views'
                      },
                      {
                        title: 'Updated',
                        dataIndex: 'updated',
                        render: v => dayjs(v).format('MM-DD HH:mm')
                      },
                      {
                        title: 'Action',
                        key: 'handle',
                        render: (v, record) => (
                          <div className={'space-x-1'}>
                            <Sync doc={record}/>
                            {record.password ?
                              <CancelLock
                                doc={record}
                                onSuccess={action(() => {
                                  record.password = false
                                  getDocs()
                                })}
                              >
                                <Button
                                  type={'link'} size={'small'}
                                  icon={<UnlockOutlined className={'text-amber-500 duration-200 hover:text-amber-600'}/>}
                                />
                              </CancelLock> :
                              <Lock
                                doc={record}
                                onSuccess={action(() => {
                                  record.password = true
                                  getDocs()
                                })}>
                                <Button
                                  type={'link'} size={'small'}
                                  icon={<LockOutlined />}
                                />
                              </Lock>
                            }
                            <CloseShare doc={record} onRemove={() => {
                              getDocs()
                            }}>
                              <Button
                                type={'link'} size={'small'} danger={true}
                                icon={<StopOutlined/>}
                              />
                            </CloseShare>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'book',
              label: 'Share Book',
              children: (
                <div>
                  <Table
                    size={'small'}
                    dataSource={state.books}
                    loading={state.loading}
                    rowKey={'id'}
                    pagination={{
                      pageSize: 10,
                      current: state.bookPage,
                      total: state.bookTotal,
                      onChange: page => {
                        setState({bookPage: page})
                        getBooks()
                      }
                    }}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (v, record) => (
                          <a
                            className={'link'}
                            target={'_blank'}
                            href={`${shareStore.serviceConfig!.domain}/book/${record.path}`}
                          >{v}</a>
                        )
                      },
                      {
                        title: 'Root Path',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
                          </Tooltip>
                        )
                      },
                      {
                        title: 'Views',
                        dataIndex: 'views',
                      },
                      {
                        title: 'Updated',
                        dataIndex: 'updated',
                        render: v => dayjs(v).format('MM-DD HH:mm')
                      },
                      {
                        title: 'Delete',
                        key: 'handle',
                        render: (v, record) => (
                          <div className={'space-x-1'}>
                            <Sync book={record}/>
                            {record.password ?
                              <CancelLock
                                book={record}
                                onSuccess={action(() => {
                                  record.password = false
                                  getBooks()
                                })}
                              >
                                <Button
                                  type={'link'} size={'small'}
                                  icon={<UnlockOutlined className={'text-amber-500 duration-200 hover:text-amber-600'}/>}
                                />
                              </CancelLock> :
                              <Lock
                                book={record}
                                onSuccess={action(() => {
                                  record.password = true
                                  getBooks()
                                })}>
                                <Button
                                  type={'link'} size={'small'}
                                  icon={<LockOutlined />}
                                />
                              </Lock>
                            }
                            <CloseShare book={record} onRemove={() => {
                              getBooks()
                            }}>
                              <Button
                                type={'link'} size={'small'} danger={true}
                                icon={<StopOutlined/>}
                              />
                            </CloseShare>
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'file',
              label: 'Files',
              children: (
                <div>
                  <Table
                    size={'small'}
                    dataSource={state.files}
                    rowKey={'id'}
                    loading={state.loading}
                    footer={() => (
                      <div className={'flex items-center justify-between mb-2'}>
                        <div className={'flex items-center'}>
                          <Tooltip title={'Total dependent files'}>
                            <div className={'flex items-center text-sm dark:text-gray-400'}>
                              <CloudUploadOutlined/>
                              <span className={'ml-1'}>Files: {state.fileTotal}</span>
                              <span className={'ml-2'}>File Size: {sizeUnit(state.fileTotalSize)}</span>
                            </div>
                          </Tooltip>
                          <Tooltip title={'Bluestone will automatically manage note file dependencies, and pictures that are cited multiple times under the same book will not be uploaded repeatedly'}>
                            <QuestionCircleOutlined className={'ml-4 dark:text-gray-500 text-gray-400 hover:dark:text-gray-300'}/>
                          </Tooltip>
                        </div>
                        <div>
                          <Pagination
                            current={state.filePage}
                            total={state.fileTotal}
                            pageSize={10}
                            size={'small'}
                            onChange={page => {
                              setState({filePage: page})
                              getFiles()
                            }}
                          />
                        </div>
                      </div>
                    )}
                    pagination={false}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (v, record) => (
                          <a
                            className={'link'}
                            target={'_blank'}
                            href={`${shareStore.serviceConfig!.domain}/files/${v}`}
                          >{basename(record.filePath)}</a>
                        )
                      },
                      {
                        title: 'filePath',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
                          </Tooltip>
                        )
                      },
                      {
                        title: 'Size',
                        dataIndex: 'size',
                        render: v => <span className={'text-xs'}>{sizeUnit(v || 0)}</span>
                      },
                      {
                        title: 'Associated',
                        dataIndex: 'as',
                        render: (v, record) => {
                          return (
                            <div className={'text-sm'}>
                              {record.doc &&
                                <span>
                                <FileTextOutlined className={'mr-1 w-4'} />
                                  {record.doc.name}
                              </span>
                              }
                              {record.book &&
                                <span className={'flex items-center'}>
                                <BookIcon className={'w-4 h-4 mr-1 dark:fill-gray-300'} />
                                  {record.book.name}
                              </span>
                              }
                            </div>
                          )
                        }
                      },
                      {
                        title: 'Created',
                        dataIndex: 'created',
                        render: v => dayjs(v).format('MM-DD HH:mm')
                      }
                    ]}
                  />
                </div>
              )
            }
          ]}
        />
      </div>
    </Modal>
  )
})
