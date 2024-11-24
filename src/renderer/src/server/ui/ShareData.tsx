import {observer} from 'mobx-react-lite'
import {Button, Checkbox, Modal, Pagination, Table, Tabs, Tooltip} from 'antd'
import {useCallback, useEffect} from 'react'
import dayjs from 'dayjs'
import {
  DeleteOutlined,
  FileTextOutlined, FolderOpenOutlined,
  SettingOutlined,
  StarOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {default as BookIcon} from '../../icons/IBook'
import {IBook, IDevice, IDoc, IFile} from '../model'
import {useLocalState} from '../../hooks/useLocalState'
import {CloseShare} from './CloseShare'
import {message$, sizeUnit} from '../../utils'
import {ServiceSet} from './ServiceSet'
import {shareSuccessfully$} from './Successfully'
import {existsSync} from 'fs'
import {MainApi} from '../../api/main'
import {openEbook$} from './Ebook'
import { useCoreContext } from '../../store/core'

const Sync = observer((props: {
  doc?: IDoc
  book?: IBook
}) => {
  const core = useCoreContext()
  const [state, setState] = useLocalState({
    syncing: false
  })
  const syncDoc = useCallback(async () => {
    setState({syncing: true})
    try {
      if (props.doc) {
        const res = await core.share.shareDoc(props.doc.filePath)
        shareSuccessfully$.next(`${core.share.serviceConfig?.domain}/doc/${res.name}`)
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
  const core = useCoreContext()
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
    openServiceSet: false,
    openBookSetting: false,
    selectBookFilePath: ''
  })
  const getDocs = useCallback(() => {
    setState({loading: true})
    core.share.api.getDocs({
      page: state.docPage,
      pageSize: 10,
      all: state.all ? true : ''
    }).then(res => {
      setState({docs: res.list, docTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getDevices = useCallback(() => {
    setState({loading: true})
    core.share.api.getDevices({
      page: state.devicePage,
      pageSize: 10,
    }).then(res => {
      setState({devices: res.list, deviceTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getBooks = useCallback(() => {
    setState({loading: true})
    core.share.api.getBooks({
      page: state.bookPage,
      pageSize: 10,
      all: state.all ? true : ''
    }).then(res => {
      setState({books: res.list, bookTotal: res.total})
    }).finally(() => setState({loading: false}))
  }, [])

  const getFiles = useCallback(() => {
    setState({loading: true})
    core.share.api.getFiles({
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
      title={core.config.zh ? '分享数据' : 'Share Records'}
      width={900}
      open={props.open}
      onCancel={props.onClose}
      footer={null}
    >
      {contextHolder}
      <ServiceSet open={state.openServiceSet} onClose={() => {
        setState({openServiceSet: false})
        getDevices()
      }}/>
      <div className={'overflow-x-auto'}>
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
              label: core.config.zh ? '分享文档' : 'Share Doc',
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
                              href={`${core.share.serviceConfig?.domain}/doc/${v}`}
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
                          <div className={'flex'}>
                            <FolderOpenOutlined
                              className={'link mr-2'}
                              onClick={() => {
                                MainApi.openFile({
                                  title: 'Change mapping file',
                                  defaultFilePath: v,
                                }).then(res => {
                                  if (res.filePaths.length) {
                                    core.share.api.updateFilePath({
                                      files: [{from: v, to: res.filePaths[0]}],
                                      mode: 'updateDocs'
                                    }).then(res => {
                                      res.docs?.map(d => core.share.docMap.set(d.filePath, d))
                                      message$.next({
                                        type: 'success',
                                        content: core.config.zh ? '映射文件路径已更改' : 'Mapping file changed'
                                      })
                                      getDocs()
                                    })
                                  }
                                })
                              }}
                            />
                            <Tooltip trigger={['click']} title={v}>
                              <div
                                className={`cursor-default max-w-[400px] truncate text-xs ${existsSync(v) ? 'text-gray-500 dark:text-gray-300/80' : 'text-red-500'}`}>{v}</div>
                            </Tooltip>
                          </div>
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
              label: core.config.zh ? '分享文件夹' : 'Share Book',
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
                            href={`${core.share.serviceConfig?.domain}/book/${record.path}`}
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
                              className={`cursor-default max-w-[400px] truncate text-xs ${existsSync(v) ? 'text-gray-500 dark:text-gray-300/80' : 'text-red-500'}`}>{v}</div>
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
                            <Button
                              type={'link'} size={'small'}
                              disabled={!v.filePath.startsWith(core.tree.root?.filePath)}
                              onClick={() => {
                                openEbook$.next({folderPath: v.filePath})
                              }}
                              icon={<SettingOutlined/>}
                            />
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
              label: core.config.zh ? '依赖文件' : 'Files',
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
                            href={`${core.share.serviceConfig?.domain}/stream/${v}`}
                          >{record.filePath.includes('/') ? record.filePath.split('/').pop() : record.filePath.split('\\').pop()}</a>
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
                                  <a href={`${core.share.serviceConfig?.domain}/doc/${record.doc.name}`}
                                     className={'link'} target={'_blank'}>
                                    {record.doc.name}
                                  </a>
                                </span>
                              }
                              {record.book &&
                                <span className={'flex items-center'}>
                                  <BookIcon className={'w-4 h-4 mr-1 dark:fill-gray-300'}/>
                                  <a className={'link'}
                                     href={`${core.share.serviceConfig?.domain}/book/${record.book.path}`}
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
              label: core.config.zh ? '设备' : 'Devices',
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
                            {record.id === core.share.serviceConfig?.deviceId &&
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
                            {record.id === core.share.serviceConfig?.deviceId &&
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
                                  title: core.config.zh ? '提示' : 'Notice',
                                  type: 'warning',
                                  content: core.config.zh ? '删除设备将清除设备下的所有共享数据，删除后无法访问。' : 'Deleting a device will clear all shared data under the device and will become inaccessible.',
                                  onOk: () => {
                                    const currentId = core.share.serviceConfig?.deviceId
                                    return core.share.delDevice(record.id).then(() => {
                                      message$.next({
                                        type: 'success',
                                        content: core.config.zh ? '删除成功' : 'successfully deleted'
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
