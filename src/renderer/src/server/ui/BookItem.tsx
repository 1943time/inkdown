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
import { treeStore } from '../../store/tree'
import { useLocalState } from '../../hooks/useLocalState'
import { action } from 'mobx'
import { shareStore } from '../store'
import { NotLogged } from './NotLogged'
import { EBook, openEbook$ } from './Ebook'
import { shareSuccessfully$ } from './Successfully'
import { configStore } from '../../store/config'
import { Icon } from '@iconify/react'

export const BookItem = observer(
  (props: {
    books: ShareBook[]
    onCopy: (url: string) => void
    onMask: (mask: boolean) => void
    onRefresh: () => void
    onOpenSetting: () => void
  }) => {
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
              ? configStore.zh
                ? '当前工作区中分享的文件夹'
                : 'Books in current workspace folder'
              : configStore.zh
              ? '将多个笔记组合为 Book'
              : 'Combine multiple notes into a book'}
          </span>
        </div>
        {!shareStore.serviceConfig && <NotLogged onOpen={props.onOpenSetting} />}
        {!!shareStore.serviceConfig && (
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
                      href={`${shareStore.serviceConfig?.domain}/book/${b.path}`}
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
                          shareStore
                            .shareBook({
                              ...b,
                              name: ''
                            })
                            .then(() => {
                              shareSuccessfully$.next(
                                `${shareStore.serviceConfig?.domain}/book/${b.path}`
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
                            label: configStore.zh ? '复制链接' : 'Copy Link',
                            key: 'copy',
                            icon: <CopyOutlined />,
                            onClick: () => {
                              props.onCopy(`${shareStore.serviceConfig?.domain}/book/${b.path}`)
                            }
                          },
                          {
                            label: configStore.zh ? '设置' : 'Settings',
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
                            label: configStore.zh ? '删除' : 'Remove',
                            key: 'remove',
                            icon: <StopOutlined />,
                            danger: true,
                            onClick: () => {
                              props.onMask(true)
                              modal.confirm({
                                title: 'Notice',
                                content: configStore.zh
                                  ? `确认删除已分享的文件夹 ${b.name}`
                                  : `Confirm to remove shared book ${b.name}`,
                                onOk: () => {
                                  return shareStore
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
        {!!shareStore.serviceConfig && (
          <div className={'mt-3 flex space-x-5'}>
            <Button
              onClick={() => {
                props.onMask(true)
                openEbook$.next({ folderPath: treeStore.root!.filePath })
              }}
              icon={<BookOutlined />}
              disabled={!shareStore.serviceConfig || !treeStore.root}
              className={'flex-1'}
              block={true}
            >
              <span>{configStore.zh ? '分享文件夹' : 'Create Book'}</span>
            </Button>
          </div>
        )}
      </div>
    )
  }
)
