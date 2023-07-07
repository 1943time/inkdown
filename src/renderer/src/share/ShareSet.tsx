import {observer} from 'mobx-react-lite'
import {
  CheckOutlined,
  CopyOutlined,
  EditOutlined,
  HistoryOutlined,
  ReadOutlined,
  SendOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {Alert, Button, Input, notification, Popover, Space, Tabs} from 'antd'
import Net from '../assets/ReactIcon/Net'
import {treeStore} from '../store/tree'
import {ServerSet} from './ServerSet'
import {useLocalState} from '../hooks/useLocalState'
import {useCallback, useEffect} from 'react'
import {MainApi} from '../api/main'
import {mediaType} from '../editor/utils/dom'
import {message$} from '../utils'
import {Sync} from './sync'
import {Record} from './Record'
import {Ebook} from './Ebook'
import {Book, db} from './db'

export const ShareSet = observer(() => {
  const [state, setState] = useLocalState({
    openSet: false,
    popOpen: false,
    config: null as any,
    docPathHash: '',
    syncing: false,
    openRecord: false,
    ebookOpen: false,
    selectedBookId: undefined as number | undefined,
    tab: 'doc',
    books: [] as Book[]
  })
  const [api, contextHolder] = notification.useNotification()
  const getDocUrl = useCallback(() => {
    return `${state.config?.domain || 'https://***'}/doc/${state.docPathHash}`
  }, [])
  const copyDocUrl = useCallback(() => {
    window.api.copyToClipboard(getDocUrl())
    message$.next({
      type: 'success',
      content: '复制到剪贴板'
    })
  }, [])
  useEffect(() => {
    MainApi.getServerConfig().then((res) => {
      if (res) setState({config: res})
      if (mediaType(treeStore.currentTab.current?.filePath || '') === 'markdown') {
        setState({
          docPathHash: window.api.md5(treeStore.currentTab.current!.filePath)
        })
      }
    })
  }, [state.popOpen])

  const getBooks = useCallback(() => {
    db.book.where('filePath').equals(treeStore.root?.filePath || '').toArray().then(res => {
      setState({books: res})
    })
  }, [])

  return (
    <>
      {contextHolder}
      <Popover content={(
        <div className={'w-[400px] pb-2'}>
          <Tabs
            activeKey={state.tab}
            onChange={key => {
              setState({tab: key})
              if (key === 'book') {
                getBooks()
              }
            }}
            tabBarExtraContent={(
              <Button
                type={'text'} icon={<HistoryOutlined />}
                onClick={() => setState({openRecord: true, popOpen: false})}
              >
                分享记录
              </Button>
            )}
            items={[
              {
                key: 'doc',
                label: '当前文档',
                children: (
                  <div>
                    <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                      <Net className={'w-5 h-5 fill-gray-500'}/>
                      <span className={'ml-2'}>分享当前文档</span>
                    </div>
                    {!state.config &&
                      <div className={'mt-4'}>
                        <Alert message="您暂未设置分享服务，请设置后进行分享" type="warning"/>
                      </div>
                    }
                    <div className={'mt-4'}>
                      <Space.Compact className={'w-full'}>
                        <Input disabled={true} value={getDocUrl()}/>
                        <Button
                          type="default"
                          icon={<CopyOutlined />}
                          onClick={copyDocUrl}
                        >
                          复制
                        </Button>
                      </Space.Compact>
                      <Button
                        type={'primary'}
                        block={true}
                        className={'mt-6'}
                        loading={state.syncing}
                        icon={<SyncOutlined/>}
                        disabled={!state.config || !treeStore.getSchema(treeStore.currentTab.current!)}
                        onClick={async () => {
                          const schema = treeStore.getSchema(treeStore.currentTab.current!)
                          if (schema) {
                            setState({syncing: true})
                            try {
                              const key = 'Date' + Date.now()
                              const sync = new Sync()
                              await sync.syncDoc(treeStore.currentTab.current!.filePath, schema.state)
                              setState({popOpen: false})
                              api.success({
                                key,
                                message: '同步成功',
                                duration: 2,
                                btn: (
                                  <Space>
                                    <Button
                                      onClick={() => {
                                        api.destroy(key)
                                        copyDocUrl()
                                      }}
                                    >
                                      复制链接
                                    </Button>
                                    <Button
                                      type={'primary'}
                                      onClick={() => {
                                        window.open(getDocUrl())
                                        api.destroy(key)
                                      }}
                                    >
                                      打开
                                    </Button>
                                  </Space>
                                )
                              })
                            } catch (e) {
                              console.error(e)
                              message$.next({
                                type: 'info',
                                content: '同步失败'
                              })
                            } finally {
                              setState({syncing: false})
                            }
                          }
                        }}
                      >
                        同步文件
                      </Button>
                    </div>
                  </div>
                )
              },
              {
                key: 'book',
                label: '电子书',
                children: (
                  <div className={'max-h-[400px] overflow-y-auto'}>
                    <div className={'flex text-sm items-center text-gray-500 justify-center mb-2'}>
                      <Net className={'w-5 h-5 fill-gray-500'}/>
                      <span className={'ml-2'}>制作电子书</span>
                    </div>
                    {!state.config &&
                      <div className={'mt-4'}>
                        <Alert message="您暂未设置分享服务，请设置后进行分享" type="warning"/>
                      </div>
                    }
                    {state.books.map(b =>
                      <div className={'w-full flex items-center px-3 py-1 border-b border-gray-200/10 text-blue-500 mb-4'} key={b.id!}>
                        <a className={'flex-1 max-w-[240px] break-all'} href={`${state.config.domain}/book/${b.path}`} target={'_blank'}>
                          <ReadOutlined />
                          <span className={'ml-1'}>{b.name}</span>
                        </a>
                        <div className={'flex w-28 justify-between flex-shrink-0 ml-4'}>
                          <a onClick={async () => {
                            if (state.syncing) return
                            const sync = new Sync()
                            setState({syncing: true})
                            try {
                              await sync.syncEbook({
                                id: b.id!,
                                name: b.name,
                                path: b.path,
                                strategy: b.strategy,
                                ignorePaths: b.ignorePaths
                              })
                              const key = 'Date' + Date.now()
                              api.success({
                                key,
                                message: '同步成功',
                                duration: 2,
                                btn: (
                                  <Space>
                                    <Button
                                      onClick={() => {
                                        api.destroy(key)
                                        window.api.copyToClipboard(`${state.config.domain}/book/${b.path}`)
                                      }}
                                    >
                                      复制链接
                                    </Button>
                                    <Button
                                      type={'primary'}
                                      onClick={() => {
                                        window.open(`${state.config.domain}/book/${b.path}`)
                                        api.destroy(key)
                                      }}
                                    >
                                      打开
                                    </Button>
                                  </Space>
                                )
                              })
                            } catch (e) {
                              console.error(e)
                              message$.next({
                                type: 'warning',
                                content: '同步失败'
                              })
                            } finally {
                              setState({syncing: false})
                            }
                          }} className={`${state.syncing ? 'text-gray-600 cursor-not-allowed' : ''}`}>
                            <SyncOutlined className={`${state.syncing ? 'animate-spin' : ''}`}/>
                            <span className={'ml-1'}>
                              同步{state.syncing ? '中' : ''}
                            </span>
                          </a>
                          <a onClick={() => {
                            if (state.syncing) return
                            setState({popOpen: false})
                            setTimeout(() => {
                              setState({ebookOpen: true, selectedBookId: b.id!})
                            }, 200)
                          }} className={`${state.syncing ? 'text-gray-600 cursor-not-allowed' : ''}`}>
                            <EditOutlined />
                            <span className={'ml-1'}>编辑</span>
                          </a>
                        </div>
                      </div>
                    )}
                    <div className={'mt-4'}>
                      <Button
                        onClick={() => {
                          setState({popOpen: false})
                          setTimeout(() => {
                            setState({ebookOpen: true, selectedBookId: undefined})
                          }, 200)
                        }}
                        type={'primary'} block={true} disabled={!state.config || !treeStore.root}>
                        添加电子书
                      </Button>
                    </div>
                  </div>
                )
              },
              {
                key: 'set',
                label: '服务设置',
                children: (
                  <div>
                    {!!state.config ?
                      (
                        <div className={'flex text-sm items-center text-green-500 justify-center'}>
                          <CheckOutlined className={'w-5 h-5'} />
                          <span className={'ml-2'}>已设置服务</span>
                        </div>
                      ) : (
                        <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                          <Net className={'w-5 h-5 fill-gray-500'}/>
                          <span className={'ml-2'}>将自动同步文档及相关资源至您的服务</span>
                        </div>
                      )
                    }
                    <div className={'flex justify-center'}>
                      <Button
                        type={'primary'} className={'w-56 mt-4'}
                        onClick={() => {
                          setState({popOpen: false})
                          setTimeout(() => {
                            setState({openSet: true})
                          }, 200)
                        }}
                      >
                        {state.config ? '修改分享服务' : '设置分享服务'}
                      </Button>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </div>
      )} title={null} trigger="click" placement={'bottomRight'} open={state.popOpen} onOpenChange={v => setState({popOpen: v})}>
        <SendOutlined
          className={'text-lg duration-200 dark:hover:text-gray-300 hover:text-gray-600'}
        />
      </Popover>
      <ServerSet
        open={state.openSet}
        onClose={() => setState({openSet: false})}
      />
      <Record open={state.openRecord} onClose={() => setState({openRecord: false})}/>
      <Ebook open={state.ebookOpen} id={state.selectedBookId} onClose={() => {
        setState({ebookOpen: false})
        getBooks()
      }}/>
    </>
  )
})
