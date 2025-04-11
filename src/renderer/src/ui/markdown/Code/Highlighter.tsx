import { memo, ReactNode, useState } from 'react'
import { Flexbox } from 'react-layout-kit'
import { useStyles } from './highlighterStyle'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ActionIcon, ActionIconProps, CopyButton, DivProps } from '@lobehub/ui'
import SyntaxHighlighter from './SyntaxHighlighter'

export interface HighlighterProps extends DivProps {
  actionsRender?: (props: { actionIconSize: ActionIconProps['size']; content: string; language: string; originalNode: ReactNode }) => ReactNode
  /**
   * @description The code content to be highlighted
   */
  children: string
  /**
   * @description Whether to expand code blocks by default
   * @default true
   */
  defalutExpand?: boolean
  enableTransformer?: boolean
  fileName?: string
  fullFeatured?: boolean
  /**
   * @description The language of the code content
   */
  language: string
  /**
   * @description Whether to show language tag
   * @default true
   */
  /**
   * @description The type of the code block
   * @default 'block'
   */
  type?: 'ghost' | 'block' | 'pure'
  wrap?: boolean
}

export const Highlighter = memo<HighlighterProps>(({ children, language = 'markdown', className, style, type = 'block', ...rest }) => {
  const tirmedChildren = children.trim()

  const [expand, setExpand] = useState(true)
  const { styles, cx } = useStyles(type)

  const size = { blockSize: 24, fontSize: 14, strokeWidth: 2 }

  const origianlActions = (
    <CopyButton
      content={tirmedChildren}
      placement="left"
      size={size}
    />
  )

  return (
    <div
      className={cx(styles.container, className)}
      data-code-type="highlighter"
      style={style}
      {...rest}
    >
      <Flexbox
        align={'center'}
        className={`${styles.header}`}
        horizontal
        justify={'space-between'}
      >
        <ActionIcon
          icon={expand ? ChevronDown : ChevronRight}
          onClick={() => setExpand(!expand)}
          size={{ blockSize: 24, fontSize: 14, strokeWidth: 3 }}
        />
        <Flexbox
          align={'center'}
          gap={2}
          horizontal
          className={styles.select}
          justify={'center'}
        >
          <span>{language}</span>
        </Flexbox>
        <Flexbox
          align={'center'}
          flex={'none'}
          gap={4}
          horizontal
        >
          {origianlActions}
        </Flexbox>
      </Flexbox>
      <div style={expand ? {} : { height: 0, overflow: 'hidden' }}>
        <SyntaxHighlighter language={language?.toLowerCase()}>{tirmedChildren}</SyntaxHighlighter>
      </div>
    </div>
  )
})

export default Highlighter
