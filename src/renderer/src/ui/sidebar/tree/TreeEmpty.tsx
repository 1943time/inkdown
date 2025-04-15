import {observer} from 'mobx-react-lite'
import { useCoreContext } from '../../utils/env.ts'

export const TreeEmpty = observer(() => {
  const core = useCoreContext()
  return (
    <div className={'flex justify-center items-center text-gray-400 pt-32'}>
      <div className={'text-center space-y-2 px-4'}>
        <div className={'text-pretty leading-5 text-[13px]'}>
          {core.config.zh ? '尚未创建文档' : 'No document created yet'}
        </div>
      </div>
    </div>
  )
})
