import {observer} from 'mobx-react-lite'
import {Button, Modal, Table, Tabs} from 'antd'
import {useLocalState} from '../hooks/useLocalState'
// import {db, IShareNote} from '../store/db'
import {useCallback, useEffect} from 'react'
import dayjs from 'dayjs'
import {CopyOutlined, DeleteOutlined, StopOutlined} from '@ant-design/icons'
import {message$} from '../utils'
import {IDoc} from './model'
import {MainApi} from '../api/main'

export const Record = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    docs: [] as IDoc[],
    page: 1,
    pageSize: 10,
    total: 0,
    config: null as any
  })
  const getList = useCallback(async () => {
    // const total = await db.shareNote.count()
    // const list = await db.shareNote.offset((state.page - 1) * state.pageSize).limit(state.pageSize).toArray()
    // setState({docs: list, total: total})
  }, [])

  useEffect(() => {
    if (props.open) {
      setState({page: 1})
      MainApi.getServerConfig().then(res => {
        setState({config: res})
        if (res) {
          getList()
        }
      })
    }
  }, [props.open])
  return (
    <Modal
      width={900}
      open={props.open}
      title={'Shared Records'}
      onCancel={props.onClose}
      footer={null}
    >
      <Table
        dataSource={state.docs}
        rowKey={'id'}
        size={'small'}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: v => <a href={`${state.config?.domain || ''}/${v}`} target={'_blank'} className={'link'}>{v}</a>
          },
          {
            title: 'FilePath',
            dataIndex: 'filePath'
          },
          {
            title: 'Updated',
            dataIndex: 'updated',
            render: v => dayjs(v).format('MM-DD HH:mm')
          },
          {
            title: 'Action',
            dataIndex: 'action',
            render: (_, record) => (
              <div>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    window.api.copyToClipboard(`${state.config?.domain || ''}/${record.name}`)
                    message$.next({
                      type: 'success',
                      content: 'Copied to clipboard'
                    })
                  }}
                  type={'link'} size={'small'}
                />
                {/*<RemoveShare*/}
                {/*  onRemove={async () => {*/}
                {/*    await window.api.service.deleteDoc(record.name, record.filePath)*/}
                {/*    // await db.shareNote.where('filePath').equals(record.filePath).delete()*/}
                {/*    getList()*/}
                {/*  }}>*/}
                {/*  <Button*/}
                {/*    className={'ml-1.5'}*/}
                {/*    icon={<StopOutlined />}*/}
                {/*    type={'link'} danger={true} size={'small'}*/}
                {/*  />*/}
                {/*</RemoveShare>*/}
              </div>
            )
          }
        ]}
      />
    </Modal>
  )
})
