import { ChatMessage } from '@lobehub/ui'
import { IChat, MessageRole } from 'types/model'

export type IMessageProps = ChatMessage & {
  editableContent: ReactNode
  reasoning?: string
  duration?: number
}

export type IChatTable = Pick<
  IChat,
  | 'id'
  | 'topic'
  | 'created'
  | 'updated'
  | 'promptId'
  | 'websearch'
  | 'model'
  | 'clientId'
  | 'summaryIndex'
  | 'summary'
>
