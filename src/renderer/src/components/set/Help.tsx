import {observer} from 'mobx-react-lite'
import {ReactNode} from 'react'
import {Tooltip} from 'antd'
import {QuestionCircleOutlined} from '@ant-design/icons'

export const TextHelp = observer((props: {
  text: string | ReactNode
}) => {
  return (
    <Tooltip title={props.text}>
      <QuestionCircleOutlined/>
    </Tooltip>
  )
})
