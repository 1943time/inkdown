import { type ReactNode, memo } from 'react'
import { Flexbox } from 'react-layout-kit'
import { ChatItemProps, MarkdownProps } from '@lobehub/ui'
import { Reasoning } from '../../message/Reasion'
import EditableMessage from './EditableMessage'
import { IMessage } from 'types/model'

export interface MessageContentProps {
  fontSize?: number
  markdownProps?: Omit<MarkdownProps, 'className' | 'style' | 'children'>
  message?: ReactNode
  reasoning?: string
  duration?: number
  placement?: ChatItemProps['placement']
  primary?: ChatItemProps['primary']
  renderMessage?: ChatItemProps['renderMessage']
  text?: ChatItemProps['text']
  type?: ChatItemProps['type']
}

const MessageContent = memo<{ msg: IMessage }>(({ msg }) => {
  return (
    <Flexbox className={'relative overflow-hidden max-w-full'}>
      <div className={'flex flex-col'}>
        {!!msg.reasoning && (
          <Reasoning
            content={msg.reasoning}
            duration={msg.duration}
            thinking={!!msg.reasoning && !msg.duration}
          />
        )}
        <EditableMessage editButtonSize={'small'} fullFeaturedCodeBlock value={msg.content} />
      </div>
    </Flexbox>
  )
})

export default MessageContent
