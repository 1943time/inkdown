import {observer} from 'mobx-react-lite'
import {Fragment} from 'react'
import Command from '../../icons/keyboard/Command'
import Click from '../../icons/keyboard/Click'
import Shift from '../../icons/keyboard/Shift'
import Backspace from '../../icons/keyboard/Backspace'
import Enter from '../../icons/keyboard/Enter'
import Option from '../../icons/keyboard/Option'
import { isMac } from '../../utils'
import BackSlash from '../../icons/keyboard/BackSlash'

function Key({k}: {
  k: string
}) {
  if (k === 'mod') return isMac ? <Command/> : <span>Ctrl</span>
  if (k === 'shift') return <Shift/>
  if (k === 'click') return <Click/>
  if (k === 'backspace') return <Backspace/>
  if (k === 'enter') return <Enter/>
  if (k === 'option') return <Option/>
  if (k === '\\') return <BackSlash/>
  return <span>{k.toUpperCase()}</span>
}

export type IKeyItem = {
  name?: string
  key?: string[]
  disabled?: boolean
  type?: 'hr',
  click?: () => void
}
export const KeyItems = observer((props: {
  keys: IKeyItem[]
  onClick: () => void
}) => {
  return (
    <div className={'py-2 text-[13px]'}>
      {props.keys.map((item, i) =>
        <Fragment key={i}>
          {item.type !== 'hr' &&
            <div
              key={item.name}
              onClick={() => {
                if (!item.disabled) {
                  props.onClick()
                  item.click?.()
                }
              }}
              className={`px-2 ${item.disabled ? 'cursor-not-allowed text-gray-400 dark:text-gray-500' : 'cursor-pointer hover:dark:bg-gray-200/10 hover:bg-gray-200/70'}
              flex h-7 items-center justify-between rounded`}
            >
              <div>{item.name}</div>
              <div className={'flex items-center space-x-1'}>
                {item.key!.map((k) => <Key k={k} key={k}/>)}
              </div>
            </div>
          }
          {item.type === 'hr' &&
            <div className={'px-2 my-1.5'}>
              <div className={'h-[1px] dark:bg-gray-200/10 bg-gray-200'}/>
            </div>
          }
        </Fragment>
      )}
    </div>
  )
})
