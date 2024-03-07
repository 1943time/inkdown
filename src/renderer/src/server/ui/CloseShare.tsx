import {observer} from 'mobx-react-lite'
import {Popconfirm} from 'antd'
import {ReactNode} from 'react'
import {IBook, IDoc} from '../model'
import {shareStore} from '../store'
import {configStore} from '../../store/config'

export const CloseShare = observer((props: {
  children: ReactNode
  doc?: IDoc
  book?: IBook
  onRemove: () => void
}) => {
  return (
    <Popconfirm
      title={configStore.zh ? '提示' : 'Notice'}
      description={configStore.zh ? '删除后无法访问' : 'Network inaccessible after removal'}
      placement={'bottom'}
      onConfirm={() => {
        if (props.doc) {
          shareStore.api.delDoc(props.doc.id).then(() => {
            shareStore.docMap.delete(props.doc!.filePath)
            props.onRemove()
          })
        }
        if (props.book) return shareStore.delBook(props.book).then(() => {
          props.onRemove()
        })
        return Promise.resolve()
      }}
      okText={configStore.zh ? '确定' : 'Yes'}
      cancelText={configStore.zh ? '取消' : 'No'}
    >
      {props.children}
    </Popconfirm>
  )
})
