import { createStyles } from 'antd-style'
import { FC } from 'react'

import Highlighter, { type HighlighterProps } from './Highlighter'
import Mermaid, { type MermaidProps } from '../Mermaid'
import Snippet, { type SnippetProps } from '../Snippet'
import { FALLBACK_LANG } from './SyntaxHighlighter'

const useStyles = createStyles(({ css }) => ({
  container: css`
    overflow: hidden;
    margin-block: 1em;
    border-radius: calc(var(--lobe-markdown-border-radius) * 1px);
    box-shadow: 0 0 0 1px var(--lobe-markdown-border-color);
  `
}))

export type PreProps = HighlighterProps

export const Pre: FC<PreProps> = ({
  fullFeatured,
  fileName,
  language = FALLBACK_LANG,
  children,
  ...rest
}) => {
  const { styles, cx } = useStyles()

  return (
    <Highlighter
      fileName={fileName}
      fullFeatured={fullFeatured}
      language={language}
      type="block"
      {...rest}
    >
      {children}
    </Highlighter>
  )
}

export const PreSingleLine: FC<SnippetProps> = ({
  language = FALLBACK_LANG,
  children,
  ...rest
}) => {
  const { cx, styles } = useStyles()

  return (
    <Snippet data-code-type="highlighter" language={language} type={'block'} {...rest}>
      {children}
    </Snippet>
  )
}

export const PreMermaid: FC<MermaidProps> = ({ children, type, ...rest }) => {
  const { styles, cx } = useStyles()

  return (
    <Mermaid className={cx(styles.container)} type={type || 'pure'} {...rest}>
      {children}
    </Mermaid>
  )
}

export default Pre
