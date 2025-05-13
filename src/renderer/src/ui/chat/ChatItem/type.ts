import { ReactNode } from 'react'
import { FlexboxProps } from 'react-layout-kit'

import { AlertProps, AvatarProps, DivProps } from '@lobehub/ui'
import { MarkdownProps } from '@/ui/markdown/Markdown'
import { EditableMessageProps } from './components/EditableMessage'

export interface ChatItemProps extends Omit<FlexboxProps, 'children' | 'onChange'> {
  reasoning?: string
  duration?: number
  /**
   * @description Actions to be displayed in the chat item
   */
  actions?: ReactNode
  /**
   * @description Metadata for the avatar
   */
  avatarAddon?: ReactNode
  avatarProps?: AvatarProps
  /**
   * @description Whether the chat item is in editing mode
   */
  editing?: boolean
  /**
   * @description Props for Error render
   */
  error?: AlertProps
  errorMessage?: ReactNode
  fontSize?: number
  /**
   * @description Whether the chat item is in loading state
   */
  loading?: boolean
  markdownProps?: Omit<MarkdownProps, 'className' | 'style' | 'children'>
  /**
   * @description The message content of the chat item
   */
  message?: ReactNode
  messageExtra?: ReactNode
  onAvatarClick?: () => void
  /**
   * @description Callback when the message content changes
   * @param value - The new message content
   */
  onChange?: (value: string) => void
  onDoubleClick?: DivProps['onDoubleClick']
  /**
   * @description Callback when the editing mode changes
   * @param editing - The new editing mode
   */
  onEditingChange?: (editing: boolean) => void
  /**
   * @default "..."
   */
  placeholderMessage?: string
  /**
   * @description The placement of the chat item
   * @default 'left'
   */
  placement?: 'left' | 'right'
  /**
   * @description Whether the chat item is primary
   */
  primary?: boolean
  renderMessage?: (content: ReactNode) => ReactNode
  /**
   * @description Whether to show the title of the chat item
   */
  showTitle?: boolean
  text?: EditableMessageProps['text']
  /**
   * @description The timestamp of the chat item
   */
  time?: number
  /**
   * @description The type of the chat item
   * @default 'block'
   */
  type?: 'block' | 'pure'
}
