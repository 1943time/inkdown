import { observer } from 'mobx-react-lite'
import { Icon } from '@iconify/react'
import { ISpace } from '../../store/db'
import { MoreOutlined } from '@ant-design/icons'
import {treeStore} from '../../store/tree'
import {editSpace$} from './EditSpace'

export const SpaceItem = observer((props: {
  item: ISpace
  dragging: string
  onClick: () => void
  onEdit: () => void
}) => {
  return (
    <div
      className={`cursor-pointer ${props.dragging ? '' : 'dark:hover:bg-gray-200/10 hover:bg-gray-100 duration-200 group'} py-1.5 px-5 flex items-center relative`}
      onClick={props.onClick}
    >
      <div className={'flex flex-1 items-center'}>
        <div
          className={'text-white flex-shrink-0 w-6 h-6 rounded bg-indigo-400 dark:bg-indigo-500 flex items-center justify-center font-medium'}>
          {props.item.name.slice(0, 1).toUpperCase()}
        </div>
        <span className={'ml-2 flex-1 truncate max-w-56'}>{props.item.name}</span>
      </div>
      {treeStore.root?.cid === props.item.cid &&
        <div className={'pr-2'}>
          <Icon icon={'mingcute:check-fill'} className={'text-teal-500'}/>
        </div>
      }
      <div
        onClick={(e) => {
          e.stopPropagation()
          props.onEdit()
          editSpace$.next(props.item.cid!)
        }}
        className={'absolute right-1 top-1/2 dark:text-gray-400 hover:dark:bg-gray-100/10 hover:bg-gray-300/80 rounded py-0.5 -translate-y-1/2 group-hover:visible invisible flex items-center'}>
        <MoreOutlined className={'text-lg'}/>
      </div>
    </div>
  )
})
