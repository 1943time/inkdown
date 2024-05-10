import { observer } from 'mobx-react-lite'
import { Icon } from '@iconify/react'
import { ISpace } from '../../store/db'
import { MoreOutlined } from '@ant-design/icons'
import {treeStore} from '../../store/tree'
import {editSpace$} from './EditSpace'

export const SpaceItem = observer((props: {
  item: ISpace
  onClick: () => void
}) => {
  return (
    <div
      className={`cursor-pointer group dark:hover:bg-gray-200/10 hover:bg-gray-100 group py-1.5 px-3 flex items-center relative`}
      onClick={props.onClick}
    >
      <div className={'flex flex-1 items-center'}>
        <div
          className={
            `text-white flex-shrink-0 w-5 h-5 rounded flex items-center justify-center font-medium space-${props.item.background || 'sky'}`
          }
        >
          {props.item.name.slice(0, 1).toUpperCase()}
        </div>
        <span className={'ml-2 flex-1 truncate max-w-56'}>{props.item.name}</span>
      </div>
      {treeStore.root?.cid === props.item.cid && (
        <div className={'pr-2'}>
          <Icon icon={'mingcute:check-fill'} className={'text-teal-500'} />
        </div>
      )}
    </div>
  )
})
