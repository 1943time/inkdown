import {observer} from 'mobx-react-lite'
import {Icon} from '@iconify/react'
import {editSpace$} from '../space/EditSpace'
import {ISpace} from '../../store/db'
import { useTranslation } from 'react-i18next'

export const TreeEmpty = observer((props: {
  spaces: ISpace[]
}) => {
  const {t} = useTranslation()
  return (
    <div className={'flex justify-center items-center text-gray-400 pt-32'}>
      <div className={'text-center space-y-2 px-4'}>
        {!props.spaces.length &&
          <div className={'text-pretty leading-5 text-[13px]'}>
            {t('noSpace')}
          </div>
        }
        {!!props.spaces.length &&
          <div className={'text-pretty leading-5 text-[13px]'}>
            {t('selectSpace')}
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
              {t('createWorkspace')}
            </span>
          </div>
        }
      </div>
    </div>
  )
})
