import {observer} from 'mobx-react-lite'
import {configStore} from '../../store/config'
import {Icon} from '@iconify/react'
import {editSpace$} from '../space/EditSpace'
import {ISpace} from '../../store/db'

export const TreeEmpty = observer((props: {
  spaces: ISpace[]
}) => {
  return (
    <div className={'flex justify-center items-center text-gray-400 pt-32'}>
      <div className={'text-center space-y-2 px-4'}>
        {!props.spaces.length &&
          <div className={'text-pretty leading-5 text-[13px]'}>
            {configStore.zh ? '暂未创建文档空间' : 'No document space has been created yet'}
          </div>
        }
        {!!props.spaces.length &&
          <div className={'text-pretty leading-5 text-[13px]'}>
            {configStore.zh ? '请选择文档空间' : 'Please select a doc space'}
          </div>
        }
        {!props.spaces.length &&
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
        }
      </div>
    </div>
  )
})
