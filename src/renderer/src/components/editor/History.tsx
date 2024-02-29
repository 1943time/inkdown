import {observer} from 'mobx-react-lite'
import {Button, Modal, Tooltip} from 'antd'
import {useEffect, useMemo} from 'react'
import {useLocalState} from '../../hooks/useLocalState'
import {treeStore} from '../../store/tree'
import {basename} from 'path'
import {HistoryOutlined, QuestionCircleOutlined} from '@ant-design/icons'
import {Webview} from '../Webview'
import {db, IHistory} from '../../store/db'
import dayjs from 'dayjs'
import {toJS} from 'mobx'
import {configStore} from '../../store/config'

function Help(props: {
  text: string
}) {
  return (
    <Tooltip title={props.text}>
      <QuestionCircleOutlined/>
    </Tooltip>
  )
}

export const History = observer((props: {
  open: boolean
  onClose: () => void
}) => {
  const [state, setState] = useLocalState({
    fileName: '',
    selectIndex: 0,
    records: [] as IHistory[],
    show: false
  })
  useEffect(() => {
    if (props.open) {
      const note = treeStore.openedNote
      if (note?.ext === 'md') {
        db.history.where('filePath').equals(note.filePath).toArray().then(records => {
          setState({
            fileName: basename(note.filePath),
            selectIndex: 0,
            records: records.sort((a, b) => a.updated > b.updated ? -1 : 1),
            show: true
          })
        })
      }
    }
  }, [props.open])
  const schema = useMemo(() => {
    if (state.records[state.selectIndex]) return toJS(state.records[state.selectIndex]!.schema)
    return []
  }, [state.selectIndex, state.records])
  return (
    <Modal
      title={null}
      open={props.open}
      footer={null}
      width={900}
      className={'pure-modal'}
      onCancel={props.onClose}
    >
      <div className={'h-12 border-b b2 px-5 text-base font-semibold'}>
        <div className={'flex items-center h-full'}>
          <Help
            text={configStore.zh ? '最后15条记录将被记录。如果文件更改间隔超过10分钟，将添加新记录，青石将定期清理缓存。' : 'The last 15 records will be recorded. If the file change interval is more than 10 minutes, new records will be added, bluestone will clean cache periodically.'}/>
          <span className={'ml-1'}>
            {configStore.zh ? '文件历史' : 'File history for'} <span className={'text-sky-500 ml-1'}>{state.fileName}</span>
          </span>
        </div>
      </div>
      <div className={'flex h-[600px]'}>
        <div
          className={'w-[200px] border-r b2 h-full overflow-y-auto divide-y px-3 text-gray-500 dark:text-gray-300 divide-gray-200/70 dark:divide-gray-200/10 flex-shrink-0'}>
          {!state.records.length ?
            <div className={'text-center text-gray-400 text-sm mt-10'}>
              {configStore.zh ? '暂无记录' : 'No records'}
            </div> : (
              <>
                {state.records.map((r, i) =>
                  <div
                    className={`py-1.5 text-center cursor-default duration-200 ${state.selectIndex === i ? 'text-sky-500' : 'hover:text-gray-800 dark:hover:text-gray-100'}`}
                    key={r.id}
                    onClick={() => {
                      setState({show: false, selectIndex: i})
                      setTimeout(() => {
                        setState({show: true})
                      })
                    }}
                  >
                    {dayjs(r.updated).format('YY-MM-DD HH:mm')}
                  </div>
                )}
              </>
            )
          }
        </div>
        <div className={'flex-1 flex-shrink-0 overflow-y-auto'}>
          {state.show &&
            <div className={'opacity-0 animate-show'}>
              <Webview value={schema} history={true} filePath={state.records[state.selectIndex]?.filePath}/>
            </div>
          }
        </div>
      </div>
      <div className={'flex h-12 items-center justify-end border-t b2 px-4'}>
        <Button
          onClick={props.onClose}
        >
          {configStore.zh ? '取消' : 'Cancel'}
        </Button>
        <Button
          icon={<HistoryOutlined/>}
          type={'primary'} className={'ml-3'}
          disabled={!schema.length}
          onClick={() => {
            if (schema.length) {
              treeStore.currentTab.store.saveDoc$.next(schema)
            }
            props.onClose()
          }}
        >
          {configStore.zh ? '重置到此记录' : 'Reset to this record'}
        </Button>
      </div>
    </Modal>
  )
})
