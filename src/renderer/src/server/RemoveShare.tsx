import {observer} from 'mobx-react-lite'
import {Popconfirm} from 'antd'
import {ReactNode} from 'react'
import {IShareNote} from '../store/db'

export const RemoveShare = observer((props: {
  children: ReactNode
  doc?: IShareNote
  onRemove: () => void
}) => {
  return (
    <Popconfirm
      title="Note"
      description="Network inaccessible after removal"
      placement={'bottom'}
      onConfirm={props.onRemove}
      okText="Yes"
      cancelText="No"
    >
      {props.children}
    </Popconfirm>
  )
})
