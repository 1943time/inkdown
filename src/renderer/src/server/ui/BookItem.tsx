import {observer} from 'mobx-react-lite'
import Net from '../../icons/Net'
import {Fragment, useCallback} from 'react'
import IBook from '../../icons/IBook'
import {IBook as ShareBook} from '../model'
import {Button, Dropdown, Modal, Tooltip} from 'antd'
import {
  BookOutlined,
  CopyOutlined,
  LoadingOutlined,
  MoreOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {treeStore} from '../../store/tree'
import {useLocalState} from '../../hooks/useLocalState'
import {action} from 'mobx'
import {shareStore} from '../store'
import {NotLogged} from './NotLogged'
import {EBook} from './Ebook'

export const BookItem = observer((props: {
  books: ShareBook[]
  onCopy: (url: string) => void
  onMask: (mask: boolean) => void
  onRefresh: () => void
  onShareSuccess: (url: string) => void
  onOpenSetting: () => void
}) => {
  const [state, setState] = useLocalState({
    ebookOpen: false,
    currentRootPath: ''
  })
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
        <Net className={'w-5 h-5 fill-gray-500'}/>
        <span className={'ml-1'}>
          {props.books.length ? 'Books in current worker space folder' : 'Combine multiple notes into a book'}
        </span>
      </div>
      {!shareStore.serviceConfig &&
        <NotLogged onOpen={props.onOpenSetting}/>
      }
      {!!shareStore.serviceConfig &&
        <SettingOutlined
          className={'link absolute right-2 top-0'}
          onClick={props.onOpenSetting}
        />
      }
      {!!props.books.length &&
        <div className={'rounded dark:bg-black/20 bg-gray-200/50 py-1 mt-3 px-2 max-h-[200px] overflow-y-auto'}>
          {props.books.map((b, i) =>
            <Fragment key={b.id}>
              <div className={'flex items-center justify-between rounded px-1'}>
                <div className={'flex items-center'}>
                  <IBook className={'w-4 h-4 dark:fill-gray-400 fill-gray-600'}/>
                  <a
                    href={`${shareStore.serviceConfig!.domain}/book/${b.path}`}
                    target={'_blank'}
                    className={'ml-1 max-w-[330px] truncate link'}>
                    {b.name}
                  </a>
                </div>
                <div className={'flex items-center'}>
                  <Tooltip mouseEnterDelay={.5} title={'Renew'}>
                    <div
                      className={'flex items-center p-1 rounded dark:hover:bg-gray-400/10 hover:bg-black/5 mr-1'}
                      onClick={action(() => {
                        b.updating = true
                        shareStore.shareBook({
                          ...b,
                          name: ''
                        }).then(() => {
                          props.onShareSuccess(`${shareStore.serviceConfig!.domain}/book/${b.path}`)
                        }).finally(action(() => b.updating = false))
                      })}
                    >
                      {b.updating ?
                        <LoadingOutlined className={'text-base'}/> :
                        <SyncOutlined className={'text-base'}/>
                      }
                    </div>
                  </Tooltip>
                  <Dropdown
                    placement={'bottomRight'}
                    trigger={['click']}
                    menu={{
                      items: [
                        {
                          label: 'Copy Link', key: 'copy', icon: <CopyOutlined/>,
                          onClick: () => {
                            props.onCopy(`${shareStore.serviceConfig!.domain}/book/${b.path}`)
                          }
                        },
                        {
                          label: 'Settings', key: 'setting', icon: <SettingOutlined/>,
                          onClick: () => {
                            setState({ebookOpen: true, currentRootPath: b.filePath})
                            props.onMask(true)
                          }
                        },
                        {type: 'divider'},
                        {
                          label: 'Remove', key: 'remove', icon: <StopOutlined/>, danger: true,
                          onClick: () =>  {
                            props.onMask(true)
                            modal.confirm({
                              title: 'Note',
                              content: `Confirm to remove shared book ${b.name}`,
                              onOk: () => {
                                return shareStore.delBook(b).then(props.onRefresh).finally(closeMask)
                              },
                              onCancel: closeMask
                            })
                          }
                        }
                      ]
                    }}
                  >
                    <div className={'flex items-center py-1 px-0.5 rounded dark:hover:bg-gray-400/10 hover:bg-black/5'}>
                      <MoreOutlined className={'text-lg'}/>
                    </div>
                  </Dropdown>
                </div>
              </div>
              {i !== props.books.length - 1 &&
                <div className={'h-[1px] dark:bg-gray-200/10 my-1 bg-gray-200'}></div>
              }
            </Fragment>
          )}
        </div>
      }
      {!!shareStore.serviceConfig &&
        <div className={'mt-3 flex space-x-5'}>
          <Button
            onClick={() => {
              setState({ebookOpen: true, currentRootPath: treeStore.root?.filePath})
              props.onMask(true)
            }}
            icon={<BookOutlined/>}
            disabled={!shareStore.serviceConfig}
            className={'flex-1'}
            block={true}>
            <span>Create Book</span>
          </Button>
        </div>
      }
      <EBook
        open={state.ebookOpen}
        defaultRootPath={state.currentRootPath}
        onClose={() => {
          setState({ebookOpen: false})
          closeMask()
        }}
        onSave={book => {
          props.onShareSuccess(`${shareStore.serviceConfig!.domain}/book/${book.path}`)
          props.onRefresh()
        }}
      />
    </div>
  )
})
