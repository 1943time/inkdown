import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Modal, Pagination, Table, Tabs, Tooltip} from 'antd'
import {useCallback, useEffect} from 'react'
import dayjs from 'dayjs'
import {
  CloudUploadOutlined, DeleteOutlined,
  FileTextOutlined,
  QuestionCircleOutlined, SettingOutlined, StarOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {basename} from 'path'
import {default as BookIcon} from '../../icons/IBook'
import {IBook, IDevice, IDoc, IFile} from '../model'
import {useLocalState} from '../../hooks/useLocalState'
import {shareStore} from '../store'
import {shareSuccess$} from '../Share'
import {CloseShare} from './CloseShare'
import {message$, sizeUnit} from '../../utils'
import {ServiceSet} from './ServiceSet'

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
  }, [props.doc, props.book])
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
    activeKey: 'doc' as 'doc' | 'book' | 'file' | 'device',
    docs: [] as IDoc[],
    docTotal: 0,
    books: [] as IBook[],
    bookTotal: 0,
    bookPage: 1,
    docPage: 1,
    filePage: 1,
    devicePage: 1,
    deviceTotal: 0,
    devices: [] as IDevice[],
    files: [] as IFile[],
    all: false,
    fileTotal: 0,
    fileTotalSize: 0,
    loading: false,
    openServiceSet: false
  })
  const getDocs = useCallback(() => {
    setState({loading: true})
    shareStore.api.getDocs({
      page: state.docPage,
      pageSize: 10,
      all: state.all ? true : ''
    }).then(res => {
      setState({docs: res.list, docTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getDevices = useCallback(() => {
    setState({loading: true})
    shareStore.api.getDevices({
      page: state.devicePage,
      pageSize: 10,
    }).then(res => {
      setState({devices: res.list, deviceTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getBooks = useCallback(() => {
    setState({loading: true})
    shareStore.api.getBooks({
      page: state.bookPage,
      pageSize: 10,
      all: state.all ? true : ''
    }).then(res => {
      setState({books: res.list, bookTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getFiles = useCallback(() => {
    setState({loading: true})
    shareStore.api.getFiles({
      page: state.filePage,
      pageSize: 10,
      all: state.all ? true : ''
    }).then(res => {
      setState({files: res.list, fileTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])
  const initial = useCallback(() => {
    setState({
      docPage: 1,
      docTotal: 0,
      bookPage: 1,
      bookTotal: 0,
      filePage: 1,
      fileTotal: 0
    })
    if (state.activeKey === 'doc') getDocs()
    if (state.activeKey === 'book') getBooks()
    if (state.activeKey === 'file') getFiles()
    if (state.activeKey === 'device') getDevices()
  }, [])
  useEffect(() => {
    if (props.open) {
      initial()
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
      <ServiceSet open={state.openServiceSet} onClose={() => {
        setState({openServiceSet: false})
        getDevices()
      }}/>
      <div className={'min-h-[260px]'}>
        <Tabs
          activeKey={state.activeKey}
          size={'small'}
          tabBarExtraContent={(
            <Checkbox checked={state.all} onChange={(e) => {
              setState({all: e.target.checked})
              initial()
            }}>All devices</Checkbox>
          )}
          onTabClick={key => {
            setState({activeKey: key as any})
            if (key === 'doc') {
              setState({docPage: 1})
              getDocs()
            }
            if (key === 'book') {
              setState({bookPage: 1})
              getBooks()
            }
            if (key === 'file') {
              setState({filePage: 1})
              getFiles()
            }
            if (key === 'device') {
              setState({devicePage: 1})
              getDevices()
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
                      ...( state.all ?
                        [{
                        title: 'Device',
                        dataIndex: ['device', 'name']
                      }] : []),
                      {
                        title: 'Filepath',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div
                              className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
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
                      ...( state.all ?
                        [{
                          title: 'Device',
                          dataIndex: ['device', 'name']
                        }] : []),
                      {
                        title: 'Root Path',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div
                              className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
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
                        <div className={'flex items-center'}></div>
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
                            href={`${shareStore.serviceConfig!.domain}/stream/${v}`}
                          >{basename(record.filePath)}</a>
                        )
                      },
                      ...( state.all ?
                        [{
                          title: 'Device',
                          dataIndex: ['device', 'name']
                        }] : []),
                      {
                        title: 'filePath',
                        dataIndex: 'filePath',
                        render: v => (
                          <Tooltip trigger={['click']} title={v}>
                            <div
                              className={'cursor-default max-w-[300px] truncate text-xs dark:text-gray-300/80 text-gray-500'}>{v}</div>
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
                                  <FileTextOutlined className={'mr-1 w-4'}/>
                                  <a href={`${shareStore.serviceConfig!.domain}/doc/${record.doc.name}`}
                                     className={'link'} target={'_blank'}>
                                    {record.doc.name}
                                  </a>
                                </span>
                              }
                              {record.book &&
                                <span className={'flex items-center'}>
                                  <BookIcon className={'w-4 h-4 mr-1 dark:fill-gray-300'}/>
                                  <a className={'link'}
                                     href={`${shareStore.serviceConfig!.domain}/book/${record.book.path}`}
                                     target={'_blank'}>
                                    {record.book.name}
                                  </a>
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
            },
            {
              key: 'device',
              label: 'Devices',
              children: (
                <div>
                  <Table
                    size={'small'}
                    dataSource={state.devices}
                    rowKey={'id'}
                    loading={state.loading}
                    pagination={{
                      pageSize: 10,
                      current: state.devicePage,
                      total: state.deviceTotal,
                      onChange: page => {
                        setState({devicePage: page})
                        getDevices()
                      }
                    }}
                    columns={[
                      {
                        title: 'Name',
                        dataIndex: 'name',
                        render: (v, record) => (
                          <span>
                            {record.id === shareStore.serviceConfig?.deviceId &&
                              <StarOutlined className={'text-yellow-500 mr-1'}/>
                            }
                            {v}
                          </span>
                        )
                      },
                      {
                        title: 'Created',
                        dataIndex: 'created',
                        render: v => dayjs(v).format('YYYY-MM-DD HH:mm')
                      },
                      {
                        title: 'Action',
                        key: 'handle',
                        render: (v, record) => (
                          <div className={'space-x-1'}>
                            {record.id === shareStore.serviceConfig?.deviceId &&
                              <Button
                                type={'link'} size={'small'}
                                onClick={() => setState({openServiceSet: true})}
                                icon={<SettingOutlined />}
                              />
                            }
                            <Button
                              type={'link'} size={'small'} danger={true}
                              onClick={() => {
                                modal.confirm({
                                  title: 'Note',
                                  type: 'warning',
                                  content: 'Deleting a device will clear all shared data under the device and will become inaccessible.',
                                  onOk: () => {
                                    const currentId = shareStore.serviceConfig?.deviceId
                                    return shareStore.delDevice(record.id).then(() => {
                                      message$.next({
                                        type: 'success',
                                        content: 'successfully deleted'
                                      })
                                      if (record.id === currentId) {
                                        setState({
                                          docs: [],
                                          devices: [],
                                          books: [],
                                          files: []
                                        })
                                        props.onClose()
                                      } else {
                                        getDevices()
                                      }
                                    })
                                  }
                                })
                              }}
                              icon={<DeleteOutlined />}
                            />
                          </div>
                        )
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
