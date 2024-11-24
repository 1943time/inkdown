import { observer } from 'mobx-react-lite'
import Net from '../../icons/Net'
import { Fragment, useCallback } from 'react'
import IBook from '../../icons/IBook'
import { IBook as ShareBook } from '../model'
import { Button, Dropdown, Modal, Tooltip } from 'antd'
import {
  BookOutlined,
  CopyOutlined,
  LoadingOutlined,
  MoreOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { useLocalState } from '../../hooks/useLocalState'
import { action } from 'mobx'
import { NotLogged } from './NotLogged'
import { EBook, openEbook$ } from './Ebook'
import { shareSuccessfully$ } from './Successfully'
import { Icon } from '@iconify/react'
import { useCoreContext } from '../../store/core'

export const BookItem = observer(
  (props: {
    books: ShareBook[]
    onCopy: (url: string) => void
    onMask: (mask: boolean) => void
    onRefresh: () => void
    onOpenSetting: () => void
  }) => {
    const core = useCoreContext()
    const [modal, context] = Modal.useModal()
    const closeMask = useCallback(() => {
      setTimeout(() => {
        props.onMask(false)
      })
    }, [])
    return (
      <div className={'relative'}>
        {context}
        <div className={'flex text-sm items-center text-gray-500 justify-center'}>
          <Net className={'w-5 h-5 fill-gray-500'} />
          <span className={'ml-1'}>
            {props.books.length
              ? core.config.zh
                ? '当前工作区中分享的文件夹'
                : 'Books in current workspace folder'
              : core.config.zh
              ? '将多个笔记组合为 Book'
              : 'Combine multiple notes into a book'}
          </span>
        </div>
        {!core.share.serviceConfig && <NotLogged onOpen={props.onOpenSetting} />}
        {!!core.share.serviceConfig && (
          <div
            className={'link absolute right-2 top-0 cursor-pointer text-base'}
            onClick={props.onOpenSetting}
          >
            <Icon icon={'uil:setting'} />
          </div>
        )}
        {!!props.books.length && (
          <div
            className={
              'rounded dark:bg-black/20 bg-gray-200/50 py-1 mt-3 px-2 max-h-[200px] overflow-y-auto'
            }
          >
            {props.books.map((b, i) => (
              <Fragment key={b.id}>
                <div className={'flex items-center justify-between rounded px-1'}>
                  <div className={'flex items-center'}>
                    <IBook className={'w-4 h-4 dark:fill-gray-400 fill-gray-600'} />
                    <a
                      href={`${core.share.serviceConfig?.domain}/book/${b.path}`}
                      target={'_blank'}
                      className={'ml-1 max-w-[330px] truncate link'}
                    >
                      {b.name}
                    </a>
                  </div>
                  <div className={'flex items-center'}>
                    <Tooltip mouseEnterDelay={0.5} title={'Renew'}>
                      <div
                        className={
                          'flex items-center p-1 rounded dark:hover:bg-gray-400/10 hover:bg-black/5 mr-1'
                        }
                        onClick={action(() => {
                          b.updating = true
                          core.share
                            .shareBook({
                              ...b,
                              name: ''
                            })
                            .then(() => {
                              shareSuccessfully$.next(
                                `${core.share.serviceConfig?.domain}/book/${b.path}`
                              )
                            })
                            .finally(action(() => (b.updating = false)))
                        })}
                      >
                        {b.updating ? (
                          <LoadingOutlined className={'text-base'} />
                        ) : (
                          <SyncOutlined className={'text-base'} />
                        )}
                      </div>
                    </Tooltip>
                    <Dropdown
                      placement={'bottomRight'}
                      trigger={['click']}
                      menu={{
                        items: [
                          {
                            label: core.config.zh ? '复制链接' : 'Copy Link',
                            key: 'copy',
                            icon: <CopyOutlined />,
                            onClick: () => {
                              props.onCopy(`${core.share.serviceConfig?.domain}/book/${b.path}`)
                            }
                          },
                          {
                            label: core.config.zh ? '设置' : 'Settings',
                            key: 'setting',
                            icon: <SettingOutlined />,
                            onClick: () => {
                              props.onMask(true)
                              openEbook$.next({
                                folderPath: b.filePath
                              })
                            }
                          },
                          { type: 'divider' },
                          {
                            label: core.config.zh ? '删除' : 'Remove',
                            key: 'remove',
                            icon: <StopOutlined />,
                            danger: true,
                            onClick: () => {
                              props.onMask(true)
                              modal.confirm({
                                title: 'Notice',
                                content: core.config.zh
                                  ? `确认删除已分享的文件夹 ${b.name}`
                                  : `Confirm to remove shared book ${b.name}`,
                                onOk: () => {
                                  return core.share
                                    .delBook(b)
                                    .then(props.onRefresh)
                                    .finally(closeMask)
                                },
                                onCancel: closeMask
                              })
                            }
                          }
                        ]
                      }}
                    >
                      <div
                        className={
                          'flex items-center py-1 px-0.5 rounded dark:hover:bg-gray-400/10 hover:bg-black/5'
                        }
                      >
                        <MoreOutlined className={'text-lg'} />
                      </div>
                    </Dropdown>
                  </div>
                </div>
                {i !== props.books.length - 1 && (
                  <div className={'h-[1px] dark:bg-gray-200/10 my-1 bg-gray-200'}></div>
                )}
              </Fragment>
            ))}
          </div>
        )}
        {!!core.share.serviceConfig && (
          <div className={'mt-3 flex space-x-5'}>
            <Button
              onClick={() => {
                props.onMask(true)
                openEbook$.next({ folderPath: core.tree.root!.filePath })
              }}
              icon={<BookOutlined />}
              disabled={!core.share.serviceConfig || !core.tree.root}
              className={'flex-1'}
              block={true}
            >
              <span>{core.config.zh ? '分享文件夹' : 'Create Book'}</span>
            </Button>
          </div>
        )}
      </div>
    )
  }
)
