import {observer} from 'mobx-react-lite'
import {Button, Modal, Table, Tabs} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {db} from './db'
import {CopyOutlined} from '@ant-design/icons'
import {MainApi} from '../api/main'
import {extname} from 'path'
export const Record = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [modal, contextHolder] = Modal.useModal()
  const [state, setState] = useLocalState({
    activeKey: 'doc',
    docs: [] as any[],
    files: [] as any[],
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

  useEffect(() => {
    if (props.open) {
      setState({docPage: 1, filePage: 1})
      if (state.activeKey === 'doc') getDocs()
      if (state.activeKey === 'file') getFiles()
      MainApi.getServerConfig().then(res => setState({config: res}))
    }
  }, [props.open])
  return (
    <Modal
      title={'分享记录'}
      width={800}
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
        }}
        items={[
          {
            key: 'doc',
            label: '分享文档',
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
                      title: '名称',
                      dataIndex: 'name',
                      render: (v, record) => (
                        <a
                          className={'text-blue-500'}
                          onClick={() => window.open(`${state.config?.domain}/docs/${record.id}.html`)}
                        >{v}</a>
                      )
                    },
                    {
                      title: '文件路径',
                      dataIndex: 'filePath'
                    },
                    {
                      title: '更新时间',
                      dataIndex: 'updated'
                    },
                    {
                      title: '删除',
                      key: 'handle',
                      render: (v, record) => (
                        <Button
                          size={'small'} danger type={'link'}
                          onClick={() => {
                            modal.confirm({
                              title: '提示',
                              content: '将同时删除远程文件，点击确认删除',
                              onOk: async () => {
                                const sdk = new window.api.sdk()
                                await sdk.removeFile('docs/' + record.id + '.html')
                                sdk.dispose()
                                await db.doc.delete(record.id)
                                getDocs()
                              }
                            })
                          }}
                        >
                          删除
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
            label: '电子书'
          },
          {
            key: 'file',
            label: '同步文件',
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
                      title: '打开',
                      dataIndex: 'hash',
                      render: (v, record) => (
                        <a
                          className={'text-blue-500'}
                          onClick={() => window.open(`${state.config?.domain}/files/${record.hash}${extname(record.filePath)}`)}
                        >打开</a>
                      )
                    },
                    {
                      title: '文件路径',
                      dataIndex: 'filePath'
                    },
                    {
                      title: '删除',
                      key: 'handle',
                      render: (v, record) => (
                        <Button
                          size={'small'} danger type={'link'}
                          onClick={() => {
                            modal.confirm({
                              title: '提示',
                              content: '将同时删除远程文件，点击确认删除',
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
                          删除
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
