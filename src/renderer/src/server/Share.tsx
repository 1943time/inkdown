import { observer } from 'mobx-react-lite'
import {
  CopyOutlined,
  DatabaseOutlined,
  LinkOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { Button, Input, Modal, Popover, Space, Tabs } from 'antd'
import { useCallback, useEffect, useMemo } from 'react'
import Net from '../icons/Net'
import { useLocalState } from '../hooks/useLocalState'
import { message$ } from '../utils'
import { mediaType } from '../editor/utils/dom'
import { BookItem } from './ui/BookItem'
import { IBook } from './model'
import { NotLogged } from './ui/NotLogged'
import { CloseShare } from './ui/CloseShare'
import { ShareData } from './ui/ShareData'
import { action, runInAction } from 'mobx'
import { ServiceSet } from './ui/ServiceSet'
import { shareSuccessfully$, Successfully } from './ui/Successfully'
import { Icon } from '@iconify/react'
import { EBook } from './ui/Ebook'
import { useCoreContext } from '../store/core'

export const Share = observer(() => {
  const core = useCoreContext()
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
      books: core.share.getBooks(core.tree.root?.filePath || '')
    })
  }, [])

  const copyDocUrl = useCallback((url: string) => {
    window.api.copyToClipboard(url)
    message$.next({
      type: 'success',
      content: core.config.zh ? '已复制到剪贴板' : 'Copied to clipboard'
    })
  }, [])

  useEffect(() => {
    if (state.popOpen) {
      getBooks()
      setState({ refresh: !state.refresh })
    }
  }, [state.popOpen])

  const curDoc = useMemo(() => {
    return core.share.docMap.get(core.tree.openedNote?.filePath || '')
  }, [core.tree.openedNote, state.refresh])

  const closeMask = useCallback(() => {
    setTimeout(() => {
      setState({ mask: false })
    })
  }, [])

  const share = useCallback(() => {
    const note = core.tree.openedNote!
    if (note && mediaType(note.filePath) === 'markdown') {
      setState({ syncing: true })
      core.share
        .shareDoc(note.filePath, core.tree.root?.filePath)
        .then((res) => {
          setState({ refresh: !state.refresh })
          shareSuccessfully$.next(`${core.share.serviceConfig?.domain}/doc/${res.name}`)
        })
        .finally(() => setState({ syncing: false }))
    }
  }, [])

  return (
    <>
      <Successfully />
      <EBook
        onClose={() => {
          closeMask()
        }}
        onSave={(book) => {
          getBooks()
        }}
      />
      <Popover
        zIndex={100}
        content={
          <div className={'w-[450px] pb-2'}>
            <Tabs
              activeKey={state.tab}
              size={'small'}
              onChange={(key) => {
                setState({ tab: key })
              }}
              tabBarExtraContent={
                <Button
                  type={'text'}
                  icon={<DatabaseOutlined />}
                  onClick={() => {
                    if (!core.share.serviceConfig) {
                      message$.next({
                        type: 'info',
                        content: core.config.zh
                          ? '请先设置服务参数'
                          : 'Please set service parameters first'
                      })
                    } else {
                      setState({ showData: true, mask: true })
                    }
                  }}
                >
                  Data
                </Button>
              }
              items={[
                {
                  key: 'doc',
                  label: 'Doc',
                  children: (
                    <div className={'relative'}>
                      {!!core.share.serviceConfig && (
                        <div
                          className={'link absolute right-2 top-0 cursor-pointer text-base'}
                          onClick={() => {
                            setState({ mask: true, openSetting: true })
                          }}
                        >
                          <Icon icon={'uil:setting'} />
                        </div>
                      )}
                      <div className={'flex text-sm items-center text-gray-500 justify-center'}>
                        <Net className={'w-5 h-5 fill-gray-500'} />
                        <span className={'ml-2'}>
                          {core.config.zh ? '分享当前文档' : 'Share the current doc'}
                        </span>
                      </div>
                      {!core.share.serviceConfig && (
                        <NotLogged onOpen={() => setState({ mask: true, openSetting: true })} />
                      )}
                      {!!core.share.serviceConfig && (
                        <div className={'mt-4'}>
                          <Space.Compact className={'w-full'}>
                            <Input
                              disabled={true}
                              className={'cursor-default'}
                              value={`${core.share.serviceConfig?.domain || 'https://xxx'}/${
                                curDoc ? `doc/${curDoc.name}` : 'Xxx'
                              }`}
                            />
                            {curDoc ? (
                              <>
                                <Button
                                  type="default"
                                  icon={<CopyOutlined />}
                                  className={'relative hover:z-10'}
                                  onClick={() =>
                                    copyDocUrl(
                                      `${core.share.serviceConfig?.domain}/doc/${curDoc.name}`
                                    )
                                  }
                                />
                                <Button
                                  type={'default'}
                                  className={'relative hover:z-10'}
                                  onClick={() => {
                                    window.open(
                                      `${core.share.serviceConfig?.domain}/doc/${curDoc.name}`
                                    )
                                  }}
                                  icon={<LinkOutlined />}
                                />
                                <CloseShare
                                  doc={curDoc}
                                  onRemove={() => {
                                    setState({ refresh: !state.refresh })
                                  }}
                                >
                                  <Button
                                    className={'relative hover:z-10'}
                                    icon={<StopOutlined />}
                                  ></Button>
                                </CloseShare>
                              </>
                            ) : (
                              <Button
                                icon={<LinkOutlined />}
                                disabled={
                                  !core.share.serviceConfig ||
                                  mediaType(core.tree.openedNote?.filePath || '') !== 'markdown'
                                }
                                loading={state.syncing}
                                onClick={share}
                              >
                                {core.config.zh ? '分享' : 'Share'}
                              </Button>
                            )}
                          </Space.Compact>
                          {curDoc && (
                            <Button
                              block={true}
                              loading={state.syncing}
                              className={'mt-6'}
                              onClick={share}
                              icon={<SyncOutlined />}
                            >
                              {core.config.zh ? '更新并分享' : 'Update to Share'}
                            </Button>
                          )}
                        </div>
                      )}
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
                      onOpenSetting={() => setState({ mask: true, openSetting: true })}
                      onRefresh={getBooks}
                      onMask={(mask) => setState({ mask })}
                    />
                  )
                }
              ]}
            />
          </div>
        }
        title={null}
        trigger="click"
        placement={'bottomRight'}
        open={state.popOpen}
        onOpenChange={(v) => {
          if ((!v && !state.mask) || v) {
            core.tree.currentTab.store.saveDoc$.next(null)
            setState({ popOpen: v })
          }
        }}
        arrow={false}
      >
        <div
          className={
            'flex drag-none items-center justify-center w-[30px] h-[27px] rounded dark:hover:bg-gray-200/10 hover:bg-gray-200/60 cursor-pointer duration-200'
          }
        >
          <Icon icon={'majesticons:share-circle-line'} className={'text-xl'} />
        </div>
      </Popover>
      <ServiceSet
        open={state.openSetting}
        onClose={() => {
          setState({ openSetting: false })
          closeMask()
        }}
      />
      <ShareData
        open={state.showData}
        onClose={() => {
          setState({ showData: false, refresh: !state.refresh })
          closeMask()
          getBooks()
        }}
      />
      <Modal
        title={`Service program update - ${core.share.remoteVersion}`}
        width={700}
        onCancel={action(() => {
          core.share.showUpdateTips = false
          core.share.pausedUpdate = true
        })}
        open={core.share.showUpdateTips}
        onOk={action(() => {
          core.share.showUpdateTips = false
        })}
        footer={
          <Space className={'mt-4'}>
            <Button
              onClick={action(() => {
                core.share.showUpdateTips = false
                core.share.pausedUpdate = true
              })}
            >
              {core.config.zh ? '取消' : 'Cancel'}
            </Button>
            <Button
              type={'primary'}
              loading={state.upgradeLoading}
              onClick={action(() => {
                setState({ upgradeLoading: true })
                core.share.api
                  .upgrade()
                  .then(async () => {
                    message$.next({
                      type: 'success',
                      content: core.config.zh ? '更新完成' : 'Upgrade completed'
                    })
                    setState({ upgradeLoading: false })
                    const v = await core.share.api.getVersion()
                    runInAction(() => {
                      core.share.showUpdateTips = false
                      core.share.currentVersion = v.version
                    })
                  })
                  .catch((e) => {
                    message$.next({
                      type: 'error',
                      content: core.config.zh ? '更新失败' : 'Upgrade failed'
                    })
                  })
              })}
            >
              {core.config.zh ? '立即更新' : 'Update now'}
            </Button>
          </Space>
        }
      >
        <div
          dangerouslySetInnerHTML={{ __html: core.share.updateTips }}
          className={'whitespace-pre overflow-auto'}
        />
      </Modal>
    </>
  )
})
