import {observer} from 'mobx-react-lite'
import {MainApi} from '../../api/main'
import {treeStore} from '../../store/tree'
import {FolderOpenOutlined} from '@ant-design/icons'
import {configStore} from '../../store/config'
import {Icon} from '@iconify/react'
import {editSpace$} from '../space/EditSpace'
export const TreeEmpty = observer(() => {
  return (
    <div className={'h-full flex justify-center items-center text-gray-400'}>
      <div className={'text-center space-y-2 px-4'}>
        <div className={'text-pretty leading-5 text-[13px]'}>
          {configStore.zh ? '暂未创建文档空间' : 'No document space has been created yet'}
        </div>
        <div
          className={'cursor-pointer link flex justify-center items-center text-sm'}
          onClick={() => {
            editSpace$.next(null)
          }}
        >
          <Icon icon={'material-symbols:workspaces-outline'} className={'text-lg'}/>
          <span className={'ml-1'}>
            {configStore.zh ? '创建文档空间' : 'Create doc space'}
        </span>
        </div>
      </div>
    </div>
  )
})
