import { memo, ReactNode } from 'react'
import { Tooltip } from 'antd'
import { CircleHelp } from 'lucide-react'

export const TextHelp = memo((props: { text: string | ReactNode }) => {
  return (
    <Tooltip title={props.text} zIndex={2200}>
      <CircleHelp
        className={'dark:text-white/60 text-black/60 inline-block align-middle leading-normal'}
        size={14}
      />
    </Tooltip>
  )
})
