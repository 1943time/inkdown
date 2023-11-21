import {observer} from 'mobx-react-lite'
import {Popconfirm} from 'antd'
import {ReactNode} from 'react'
import {IBook, IDoc} from '../model'
import {shareStore} from '../store'

export const CloseShare = observer((props: {
  children: ReactNode
  doc?: IDoc
  book?: IBook
  onRemove: () => void
}) => {
  return (
    <Popconfirm
      title="Note"
      description="Network inaccessible after removal"
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
      okText="Yes"
      cancelText="No"
    >
      {props.children}
    </Popconfirm>
  )
})
