import {observer} from 'mobx-react-lite'
import {Popconfirm} from 'antd'
import {ReactNode} from 'react'
import {IBook, IDoc} from '../model'
import { useCoreContext } from '../../store/core'

export const CloseShare = observer((props: {
  children: ReactNode
  doc?: IDoc
  book?: IBook
  onRemove: () => void
}) => {
  const core = useCoreContext()
  return (
    <Popconfirm
      title={core.config.zh ? '提示' : 'Notice'}
      description={core.config.zh ? '删除后无法访问' : 'Network inaccessible after removal'}
      placement={'bottom'}
      onConfirm={() => {
        if (props.doc) {
          core.share.api.delDoc(props.doc.id).then(() => {
            core.share.docMap.delete(props.doc!.filePath)
            props.onRemove()
          })
        }
        if (props.book) return core.share.delBook(props.book).then(() => {
          props.onRemove()
        })
        return Promise.resolve()
      }}
      okText={core.config.zh ? '确定' : 'Yes'}
      cancelText={core.config.zh ? '取消' : 'No'}
    >
      {props.children}
    </Popconfirm>
  )
})
