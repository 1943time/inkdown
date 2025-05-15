import { observer } from 'mobx-react-lite'
import { Button, Modal, Tag } from 'antd'
import { useEffect, useMemo } from 'react'
import { HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { toJS } from 'mobx'
import { IDoc, IHistory } from 'types/model'
import { useStore } from '@/store/store'
import { useLocalState } from '@/hooks/useLocalState'
import { Webview } from './Webview'
import { TextHelp } from '@/ui/common/HelpText'
export const History = observer((props: { open: boolean; doc?: IDoc; onClose: () => void }) => {
  const store = useStore()
  const [state, setState] = useLocalState({
    name: '',
    selectIndex: 0,
    records: [] as IHistory[],
    show: true
  })
  const doc = useMemo(() => {
    const row = state.records[state.selectIndex]
    if (row) {
      return {
        name: props.doc?.name,
        id: row.id,
        schema: JSON.parse(row.schema as unknown as string),
        folder: false,
        created: 0,
        updated: 0,
        spaceId: row.spaceId
      } as IDoc
    }
    return null
  }, [state.records[state.selectIndex]])
  useEffect(() => {
    if (props.open) {
      const node = props.doc
      if (node) {
        store.model.getHistory(node.id).then((records) => {
          console.log('records', records)

          setState({
            name: node.name,
            selectIndex: 0,
            records: records
          })
        })
      }
    }
  }, [props.open, props.doc])

  const schema = useMemo(() => {
    if (state.records[state.selectIndex])
      return toJS(state.records[state.selectIndex]?.schema || [])
    return []
  }, [state.selectIndex, state.records])

  if (!props.doc) return null
  return (
    <Modal
      title={null}
      open={props.open}
      footer={null}
      style={{ top: 50 }}
      width={960}
      className={'pure-modal drag-none'}
      onCancel={props.onClose}
    >
      <div className={'h-14 border-b b2 px-5 text-sm font-semibold'}>
        <div className={'flex items-center h-full'}>
          <TextHelp text={'保存时间超过10分钟将添加新的历史记录'} />
          <span className={'ml-1'}>
            {'文件历史'}{' '}
            <span className={'ml-1 dark:text-white/70 text-black/70'}>{props.doc.name}</span>
          </span>
        </div>
      </div>
      <div className={'flex h-[600px]'}>
        <div
          className={
            'w-[220px] border-r b2 h-full overflow-y-auto py-2 px-3 text-gray-500 dark:text-gray-300 flex-shrink-0 space-y-1.5'
          }
        >
          {!state.records.length ? (
            <div className={'text-gray-400 text-sm mt-10 text-center'}>{'暂无记录'}</div>
          ) : (
            <>
              {state.records.map((r, i) => (
                <div
                  className={`py-1 px-2 duration-100 rounded cursor-pointer ${state.selectIndex === i ? 'dark:bg-gray-300/10 bg-gray-600/10' : 'dark:hover:bg-gray-300/5 hover:bg-gray-600/5'}`}
                  key={r.id}
                  onClick={() => {
                    setState({ show: false, selectIndex: i })
                    setTimeout(() => {
                      setState({ show: true })
                    })
                  }}
                >
                  <div>
                    <Tag>{dayjs(r.created).format('MM-DD HH:mm')}</Tag>
                  </div>
                  <div className={'text-xs dark:text-white/60 text-black/60 mt-0.5 pl-1'}>
                    {dayjs(r.created).fromNow()}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div className={'flex-1 flex-shrink-0 overflow-y-auto px-10'}>
          {state.show && !!doc && (
            <div className={'opacity-0 animate-show'}>
              <Webview doc={doc} />
            </div>
          )}
        </div>
      </div>
      <div className={'flex h-12 items-center justify-between border-t b2 px-4'}>
        <div>
          <Button
            danger={true}
            className={'ml-3'}
            size={'small'}
            onClick={async () => {
              if (props.doc?.id) {
                await store.model.clearHistory(props.doc?.id!)
                setState({ records: [], selectIndex: 0, show: false })
              }
            }}
          >
            Clear History
          </Button>
        </div>
        <div>
          <Button onClick={props.onClose}>{'取消'}</Button>
          <Button
            icon={<HistoryOutlined />}
            type={'primary'}
            className={'ml-3'}
            disabled={!schema.length}
            onClick={() => {
              if (doc?.schema) {
                store.note.updateDoc$.next({
                  id: props.doc?.id!,
                  schema: doc.schema,
                  ipc: false
                })
              }
              props.onClose()
            }}
          >
            {'重置到此记录'}
          </Button>
        </div>
      </div>
    </Modal>
  )
})
