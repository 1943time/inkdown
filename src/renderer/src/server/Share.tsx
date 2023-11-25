import {observer} from 'mobx-react-lite'
import {
  CopyOutlined,
  DatabaseOutlined,
  LinkOutlined,
  SendOutlined, SettingOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {Button, Input, Modal, notification, Popover, Progress, Space, Tabs} from 'antd'
import {useCallback, useEffect, useMemo} from 'react'
import {nanoid} from 'nanoid'
import Net from '../icons/Net'
import {useLocalState} from '../hooks/useLocalState'
import {treeStore} from '../store/tree'
import {message$} from '../utils'
import {mediaType} from '../editor/utils/dom'
import {BookItem} from './ui/BookItem'
import {Subject} from 'rxjs'
import {useSubject} from '../hooks/subscribe'
import {IBook} from './model'
import {shareStore} from './store'
import {NotLogged} from './ui/NotLogged'
import {CloseShare} from './ui/CloseShare'
import {ShareData} from './ui/ShareData'
import {action, runInAction} from 'mobx'
import {ServiceSet} from './ui/ServiceSet'

export const shareSuccess$ = new Subject<string>()
export const Share = observer(() => {
  const [state, setState] = useLocalState({
    popOpen: false,
    syncing: false,
    tab: 'doc',
    refresh: false,
    books: [] as IBook[],
    mask: false,
    showData: false,
    openSetting: false,
    upgradeLoading: false
  })
  const getBooks = useCallback(() => {
    setState({
      books: shareStore.getBooks(treeStore.root?.filePath || '')
    })
  }, [])

  useEffect(() => {
    if (state.popOpen) {
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
                  type={'text'} icon={<DatabaseOutlined/>}
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
                  Data
                </Button>
              )}
              items={[
                {
                  key: 'doc',
                  label: 'Note',
                  children: (
                    <div className={'relative'}>
                      {!!shareStore.serviceConfig &&
                        <SettingOutlined
                          className={'link absolute right-2 top-0'}
                          onClick={() => {
                            setState({mask: true, openSetting: true})
                          }}
                        />
                      }
                      <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                        <Net className={'w-5 h-5 fill-gray-500'}/>
                        <span className={'ml-2'}>{'Share the current note'}</span>
                      </div>
                      {!shareStore.serviceConfig &&
                        <NotLogged onOpen={() => setState({mask: true, openSetting: true})}/>
                      }
                      {!!shareStore.serviceConfig &&
                        <div className={'mt-4'}>
                          <Space.Compact className={'w-full'}>
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
                      }
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
                      onOpenSetting={() => setState({mask: true, openSetting: true})}
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
            treeStore.currentTab.store.saveDoc$.next(null)
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
      <ShareData
        open={state.showData}
        onClose={() => {
          setState({showData: false, refresh: !state.refresh})
          closeMask()
          getBooks()
        }}
      />
      <Modal
        title={`Service program update - ${shareStore.remoteVersion}`}
        width={700}
        onCancel={action(() => {
          shareStore.showUpdateTips = false
          shareStore.pausedUpdate = true
        })}
        open={shareStore.showUpdateTips}
        okText={'Details'}
        onOk={action(() => {
          shareStore.showUpdateTips = false
        })}
        footer={(
          <Space className={'mt-4'}>
            <Button onClick={action(() => {
              shareStore.showUpdateTips = false
              shareStore.pausedUpdate = true
            })}>{'Cancel'}</Button>
            <Button
              type={'primary'}
              loading={state.upgradeLoading}
              onClick={action(() => {
                setState({upgradeLoading: true})
                shareStore.api.upgrade().then(() => {
                  message$.next({
                    type: 'success',
                    content: 'Upgrade completed'
                  })
                  setState({upgradeLoading: false})
                  runInAction(() => shareStore.showUpdateTips = false)
                }).catch(e => {
                  message$.next({
                    type: 'error',
                    content: 'Upgrade failed'
                  })
                })
              })}
            >
              Update now
            </Button>
          </Space>
        )}
      >
        <div dangerouslySetInnerHTML={{__html: shareStore.updateTips}} className={'whitespace-pre overflow-auto'}/>
      </Modal>
    </>
  )
})
