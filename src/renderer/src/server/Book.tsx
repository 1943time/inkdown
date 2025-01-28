import { Button, Empty, Modal, Table, Typography } from 'antd'
import { observer } from 'mobx-react-lite'
import { useCoreContext } from '../store/core'
import { useCallback, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)
export const Book = observer((props: { visible: boolean }) => {
  const core = useCoreContext()
  const [modal, context] = Modal.useModal()
  const [state, setState] = useLocalState({
    page: 1,
    pageSize: 10,
    name: '',
    loading: false,
    total: 0,
    list: [] as any[]
  })
  const getBooks = useCallback(() => {
    setState({ loading: true })
    core.pb.api
      ?.getBooks({
        page: state.page,
        pageSize: state.page,
        name: state.name,
        sort: ['created', 'desc']
      })
      .then((res) => {
        setState({ list: res.books, total: res.total })
      })
      .finally(() => {
        setState({ loading: false })
      })
  }, [])
  useEffect(() => {
    if (props.visible) {
      getBooks()
    }
  }, [props.visible])
  if (!core.pb.host) {
    return (
      <div className={'py-5'}>
        <div className={'text-center px-5'}>
          After configuring the service program, any folder can be published as online
          documentation.{' '}
          <a href={`https://docs.inkdown.cn/doc/${core.config.zh ? 'zh' : 'en'}`} className={'text-blue-500 underline hover:underline'} target={'_blank'}>
            Details
          </a>
        </div>
      </div>
    )
  }
  return (
    <>
      {context}
      <Table
        size={'small'}
        loading={state.loading}
        dataSource={state.list}
        rowKey={'id'}
        pagination={{
          total: state.total,
          current: state.page,
          pageSize: state.pageSize,
          onChange: (page) => {
            setState({ page })
            getBooks()
          }
        }}
        columns={[
          {
            title: 'ID',
            dataIndex: 'id',
            render: (v) => (
              <a
                href={`${core.pb.host}/doc/${v}`}
                className={'underline hover:underline text-blue-500'}
                target={'_blank'}
              >
                {v}
              </a>
            )
          },
          {
            title: 'Name',
            dataIndex: 'name'
          },
          {
            title: 'Created',
            dataIndex: 'created',
            render: (v) => dayjs(v).fromNow()
          },
          {
            title: 'Updated',
            dataIndex: 'updated',
            render: (v) => dayjs(v).fromNow()
          },
          {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
              <Button
                size={'small'}
                danger={true}
                type={'text'}
                onClick={() => {
                  modal.confirm({
                    title: 'Note',
                    content:
                      'All files associated with the book will be deleted and will be inaccessible after deletion',
                    okType: 'danger',
                    okText: 'Delete',
                    onOk: () => {
                      return core.pb.api?.deleteBook(record.id).then(() => {
                        getBooks()
                      })
                    }
                  })
                }}
              >
                Delete
              </Button>
            )
          }
        ]}
      />
    </>
  )
})
