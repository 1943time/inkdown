import { MessageInput, MessageInputProps, MessageModalProps } from '@lobehub/ui'
import { memo, useState } from 'react'
import BubblesLoading from '../../message/BubbleLoading'
import Markdown from '@/ui/markdown/Markdown'
export interface EditableMessageProps {
  /**
   * @title The class name for the Markdown and MessageInput component
   */
  classNames?: {
    /**
     * @title The class name for the MessageInput component
     */
    input?: string
    /**
     * @title The class name for the Markdown component
     */
    markdown?: string
    textarea?: string
  }
  editButtonSize?: MessageInputProps['editButtonSize']
  /**
   * @title Whether the component is in edit mode or not
   * @default false
   */
  editing?: boolean
  fontSize?: number
  fullFeaturedCodeBlock?: boolean
  height?: MessageInputProps['height']
  inputType?: MessageInputProps['type']
  model?: {
    extra?: MessageModalProps['extra']
    footer?: MessageModalProps['footer']
  }
  placeholder?: string
  /**
   * @title Whether to show the edit button when the text value is empty
   * @default false
   */
  showEditWhenEmpty?: boolean
  text?: MessageModalProps['text']
  /**
   * @title The current text value
   */
  value: string
}

const EditableMessage = memo<EditableMessageProps>(
  ({
    value,
    classNames = {},
    placeholder,
    showEditWhenEmpty = false,
    height,
    inputType,
    editButtonSize,
    text,
    fullFeaturedCodeBlock,
    fontSize
  }) => {
    const [isEdit, setTyping] = useState(false)
    const isAutoSize = height === 'auto'
    if (value === '...') return <BubblesLoading />
    const input = (
      <MessageInput
        className={classNames?.input}
        classNames={{ textarea: classNames?.textarea }}
        defaultValue={value}
        editButtonSize={editButtonSize}
        height={height}
        onCancel={() => setTyping(false)}
        onConfirm={(text) => {
          setTyping(false)
        }}
        placeholder={placeholder}
        shortcut
        text={text}
        textareaClassname={classNames?.input}
        type={inputType}
      />
    )

    if (!value && showEditWhenEmpty) return input

    return (
      <>
        {isEdit ? (
          input
        ) : (
          <Markdown
            className={classNames?.markdown}
            fontSize={fontSize}
            fullFeaturedCodeBlock={fullFeaturedCodeBlock}
            style={{
              height: isAutoSize ? 'unset' : height
            }}
            variant={'chat'}
          >
            {value || placeholder || ''}
          </Markdown>
        )}
      </>
    )
  }
)

export default EditableMessage
