import {observer} from 'mobx-react-lite'
import {
  CopyOutlined,
  DatabaseOutlined,
  LinkOutlined,
  SendOutlined,
  SettingOutlined,
  StopOutlined, SyncOutlined
} from '@ant-design/icons'
import {Button, Input, notification, Popover, Space, Tabs} from 'antd'
import {useCallback, useEffect, useMemo} from 'react'
import {nanoid} from 'nanoid'
import Net from '../icons/Net'
import {useLocalState} from '../hooks/useLocalState'
import {treeStore} from '../store/tree'
import {message$, nid} from '../utils'
import {mediaType} from '../editor/utils/dom'
import {configStore} from '../store/config'
import {Subject} from 'rxjs'
import {useSubject} from '../hooks/subscribe'
import {ServiceSet} from './ServiceSet'
import {Record} from './Record'
import {RemoveShare} from './RemoveShare'
import {db, IShareNote} from '../store/db'
import {exportToHtmlString} from '../editor/output/html'

export const shareSuccess$ = new Subject<string>()
export const Server = observer(() => {
  const [state, setState] = useLocalState({
    popOpen: false,
    syncing: false,
    tab: 'doc',
    refresh: false,
    inputPassword: '',
    // books: [] as ShareBook[],
    mask: false,
    showData: false,
    openSetting: false,
    openRecord: false,
    curDoc: null as null | IShareNote
  })

  const [api, contextHolder] = notification.useNotification()

  useSubject(shareSuccess$, (url: string) => {
    shareSuccess(url)
  })
  const openNote = useMemo(() => {
    if (treeStore.openNote && mediaType(treeStore.openNote.filePath) === 'markdown') return treeStore.openNote.filePath
    return null
  }, [treeStore.openNote, state.refresh])

  useEffect(() => {
    if (openNote) {
      db.shareNote.where('filePath').equals(openNote).first().then(res => {
        setState({curDoc: res || null})
      })
    } else {
      setState({curDoc: null})
    }
  }, [openNote, state.refresh])

  const copyDocUrl = useCallback((url: string) => {
    window.api.copyToClipboard(url)
    message$.next({
      type: 'success',
      content: 'Copied to clipboard'
    })
  }, [])

  const closeMask = useCallback(() => {
    setTimeout(() => {
      setState({mask: false})
    })
  }, [])

  const shareSuccess = useCallback((url: string) => {
    const key = nanoid()
    api.success({
      key,
      message: 'Synchronization succeeded',
      duration: 3,
      btn: (
        <Space>
          <Button
            onClick={() => {
              api.destroy(key)
              copyDocUrl(url)
            }}
          >
            Copy Link
          </Button>
          <Button
            type={'primary'}
            onClick={() => {
              window.open(url)
              api.destroy(key)
            }}
          >
            Open
          </Button>
        </Space>
      )
    })
  }, [])

  const share = useCallback(async () => {
    const note = treeStore.openNote
    if (note && mediaType(note.filePath) === 'markdown') {
      setState({syncing: true})
      try {
        const record = await db.shareNote.where('filePath').equals(note.filePath).first()
        const html = await exportToHtmlString(treeStore.openNote!, true)
        const name = record ? record.name : `doc/${nid()}.html`
        await window.api.service.uploadDoc(name, html)
        if (record) {
          await db.shareNote.where('filePath').equals(note.filePath).modify({
            updated: Date.now()
          })
        } else {
          await db.shareNote.add({
            id: nanoid(),
            name,
            filePath: note.filePath,
            updated: Date.now()
          })
        }
        setState({refresh: !state.refresh})
        shareSuccess(configStore.serviceConfig!.domain + '/' + name)
      } catch (e: any) {
        message$.next({
          type: 'error',
          content: e.toString()
        })
      } finally {
        setState({syncing: false})
      }
    }
  }, [])

  return (
    <>
      {contextHolder}
      <Popover
        zIndex={100}
        content={(
          <div className={'w-[400px]'}>
            <Tabs
              activeKey={state.tab}
              size={'small'}
              onChange={key => {
                setState({tab: key})
              }}
              tabBarExtraContent={(
                <>
                  <Button
                    type={'text'} icon={<DatabaseOutlined />}
                    disabled={!configStore.serviceConfig}
                    onClick={() => {
                      setState({mask: true, openRecord: true})
                    }}
                  >
                    Records
                  </Button>
                </>
              )}
              items={[
                {
                  key: 'doc',
                  label: 'Share Note',
                  children: (
                    <div className={'relative'}>
                      <Button
                        className={'absolute right-0 -top-2'}
                        type={'link'}
                        onClick={() => {
                          setState({mask: true, openSetting: true})
                        }}
                        icon={<SettingOutlined />}
                      />
                      <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                        <Net className={'w-5 h-5 fill-gray-500'}/>
                        <span className={'ml-2'}>{configStore.serviceConfig ? 'Synchronize current note to service' : 'Share the current note to your own service'}</span>
                      </div>
                      {!configStore.serviceConfig &&
                        <>
                          <div className={'text-center text-[13px] mt-4 text-gray-500'}>
                            This feature requires you to have basic technical skills, please refer to the <a className={'link'}>guide</a> for details.
                          </div>
                          <Button
                            block={true} className={'mt-4'}
                            onClick={() => {
                              setState({mask: true, openSetting: true})
                            }}
                          >
                            Set service parameters
                          </Button>
                        </>
                      }
                      {!!configStore.serviceConfig &&
                        <div className={'mt-4'}>
                          <Space.Compact className={'w-full'}>
                            <Input
                              disabled={true}
                              className={'cursor-default'}
                              value={`${state.curDoc ? state.curDoc.name : 'doc/xxx.html'}`}
                            />
                            {state.curDoc ?
                              <>
                                <Button
                                  type="default"
                                  icon={<CopyOutlined/>}
                                  className={'relative hover:z-10'}
                                  onClick={() => copyDocUrl(`${configStore.serviceConfig?.domain}/${state.curDoc!.name}`)}
                                />
                                <Button
                                  type={'default'}
                                  className={'relative hover:z-10'}
                                  onClick={() => {
                                    window.open(`${configStore.serviceConfig?.domain}/${state.curDoc!.name}`)
                                  }}
                                  icon={<LinkOutlined/>}
                                />
                                <RemoveShare
                                  doc={state.curDoc!}
                                  onRemove={async () => {
                                    await window.api.service.deleteDoc(state.curDoc!.name)
                                    await db.shareNote.where('filePath').equals(state.curDoc!.filePath).delete()
                                    setState({refresh: !state.refresh})
                                  }}>
                                  <Button
                                    className={'relative hover:z-10'}
                                    icon={<StopOutlined/>}
                                  >
                                  </Button>
                                </RemoveShare>
                              </> :
                              <Button
                                icon={<LinkOutlined/>}
                                loading={state.syncing}
                                disabled={!openNote}
                                onClick={share}
                              >
                                Create
                              </Button>
                            }
                          </Space.Compact>
                          {state.curDoc &&
                            <Button
                              block={true}
                              loading={state.syncing}
                              className={'mt-6'}
                              onClick={share}
                              icon={<SyncOutlined/>}
                            >
                              Update to Share
                            </Button>
                          }
                        </div>
                      }
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
        title={null} trigger="click" placement={'bottomRight'} open={state.popOpen} onOpenChange={v => {
        if ((!v && !state.mask) || v) {
          setState({popOpen: v})
        }
      }}
        arrow={false}
      >
        <div className={'flex items-center justify-center p-1 group'}>
          <SendOutlined
            className={'text-lg duration-200 dark:group-hover:text-gray-300 group-hover:text-gray-700'}
          />
        </div>
      </Popover>
      <ServiceSet
        open={state.openSetting}
        onClose={() => {
          setState({openSetting: false})
          closeMask()
        }}
      />
      <Record
        open={state.openRecord}
        onClose={() => {
          setState({openRecord: false})
          closeMask()
        }}
      />
    </>
  )
})
