import {observer} from 'mobx-react-lite'
import {
  CopyOutlined,
  HistoryOutlined,
  LinkOutlined,
  LockOutlined,
  SendOutlined,
  StopOutlined,
  SyncOutlined,
  UnlockOutlined
} from '@ant-design/icons'
import {Alert, Button, Input, notification, Popconfirm, Popover, Space, Tabs} from 'antd'
import {useCallback, useEffect, useMemo} from 'react'
import {action} from 'mobx'
import {nanoid} from 'nanoid'
import Net from '../icons/Net'
import {useLocalState} from '../hooks/useLocalState'
import {treeStore} from '../store/tree'
import {message$} from '../utils'
import {mediaType} from '../editor/utils/dom'
import {BookItem} from './ui/BookItem'
import {CancelLock, Lock} from './ui/Lock'
import {Subject} from 'rxjs'
import {useSubject} from '../hooks/subscribe'
import {IBook} from './model'
import {shareStore} from './store'
import {NotLogged} from './ui/NotLogged'
import {CloseShare} from './ui/CloseShare'
import {ShareData} from './ui/ShareData'
export const shareSuccess$ = new Subject<string>()
export const Share = observer(() => {
  const [state, setState] = useLocalState({
    popOpen: false,
    syncing: false,
    tab: 'doc',
    refresh: false,
    inputPassword: '',
    books: [] as IBook[],
    mask: false,
    showData: false,
    openSetting: false
  })
  const getBooks = useCallback(() => {
    setState({
      books: shareStore.getBooks(treeStore.root?.filePath || '')
    })
  }, [])

  useEffect(() => {
    if (state.popOpen) {
      setState({inputPassword: ''})
      // shareStore.initial().then(() => {
      //   setState({refresh: !state.refresh})
      //   getBooks()
      // })
      getBooks()
      setState({refresh: !state.refresh})
    }
  }, [state.popOpen])

  const [api, contextHolder] = notification.useNotification()

  useSubject(shareSuccess$, (url: string) => {
    shareSuccess(url)
  })

  const curDoc = useMemo(() => {
    return shareStore.docMap.get(treeStore.openedNote?.filePath || '')
  }, [treeStore.openNote, state.refresh])

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

  const share = useCallback(() => {
    const note = treeStore.openedNote!
    if (note && mediaType(note.filePath) === 'markdown') {
      setState({syncing: true})
      shareStore.shareDoc(note.filePath, treeStore.root?.filePath).then(res => {
        setState({refresh: !state.refresh})
        shareSuccess(`${shareStore.serviceConfig!.domain}/doc/${res.name}`)
      }).finally(() => setState({syncing: false}))
    }
  }, [])

  return (
    <>
      {contextHolder}
      <Popover
        zIndex={100}
        content={(
          <div className={'w-[450px] pb-2'}>
            <Tabs
              activeKey={state.tab}
              size={'small'}
              onChange={key => {
                setState({tab: key})
              }}
              tabBarExtraContent={(
                <Button
                  type={'text'} icon={<HistoryOutlined/>}
                  onClick={() => {
                    if (!shareStore.serviceConfig) {
                      message$.next({
                        type: 'info',
                        content: 'You need to set up your service first'
                      })
                    } else {
                      setState({showData: true, mask: true})
                    }
                  }}
                >
                  Share Data
                </Button>
              )}
              items={[
                {
                  key: 'doc',
                  label: 'Note',
                  children: (
                    <div>
                      <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                        <Net className={'w-5 h-5 fill-gray-500'}/>
                        <span className={'ml-2'}>{'Share the current note'}</span>
                      </div>
                      {!shareStore.serviceConfig &&
                        <NotLogged onSetupVisible={visible => {
                          if (visible) {
                            setState({mask: true})
                          } else {
                            closeMask()
                          }
                        }}/>
                      }
                      <div className={'mt-4'}>
                        <Space.Compact className={'w-full'}>
                          {curDoc &&
                            <>
                              {curDoc.password ?
                                <CancelLock
                                  doc={curDoc}
                                  onSuccess={action(() => curDoc.password = false)}
                                >
                                  <Button
                                    icon={<UnlockOutlined className={'text-amber-500'}/>}
                                  >
                                  </Button>
                                </CancelLock>
                                :
                                (
                                  <Lock
                                    onSuccess={action(() => {
                                      curDoc.password = true
                                      setState({refresh: !state.refresh})
                                    })}>
                                    <Button
                                      icon={<LockOutlined/>}
                                    >
                                    </Button>
                                  </Lock>
                                )
                              }
                            </>
                          }
                          <Input
                            disabled={true}
                            className={'cursor-default'}
                            value={`${shareStore.serviceConfig?.domain || 'https://xxx'}/${curDoc ? `doc/${curDoc.name}` : 'Xxx'}`}
                          />
                          {curDoc ?
                            <>
                              <Button
                                type="default"
                                icon={<CopyOutlined/>}
                                className={'relative hover:z-10'}
                                onClick={() => copyDocUrl(`${shareStore.serviceConfig?.domain}/doc/${curDoc.name}`)}
                              />
                              <Button
                                type={'default'}
                                className={'relative hover:z-10'}
                                onClick={() => {
                                  window.open(`${shareStore.serviceConfig?.domain}/doc/${curDoc.name}`)
                                }}
                                icon={<LinkOutlined/>}
                              />
                              <CloseShare doc={curDoc} onRemove={() => {
                                shareStore.docMap.delete(curDoc.filePath)
                                setState({refresh: !state.refresh})
                              }}>
                                <Button
                                  className={'relative hover:z-10'}
                                  icon={<StopOutlined/>}
                                >
                                </Button>
                              </CloseShare>
                            </> :
                            <Button
                              icon={<LinkOutlined/>}
                              disabled={!shareStore.serviceConfig || mediaType(treeStore.openedNote?.filePath || '') !== 'markdown'}
                              loading={state.syncing}
                              onClick={share}
                            >
                              Create
                            </Button>
                          }
                        </Space.Compact>
                        {curDoc &&
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
                    </div>
                  )
                },
                {
                  key: 'book',
                  label: 'Book',
                  children: (
                    <BookItem
                      books={state.books}
                      onCopy={copyDocUrl}
                      onShareSuccess={shareSuccess}
                      onRefresh={getBooks}
                      onMask={mask => setState({mask})}
                    />
                  )
                }
              ]}
            />
          </div>
        )}
        title={null}
        trigger="click" placement={'bottomRight'} open={state.popOpen}
        onOpenChange={v => {
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
      <ShareData
        open={state.showData}
        onClose={() => {
          setState({showData: false, refresh: !state.refresh})
          closeMask()
          getBooks()
        }}
      />
    </>
  )
})
