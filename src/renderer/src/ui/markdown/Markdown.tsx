import { CSSProperties, memo, useMemo } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type { Pluggable } from 'unified'

import { CodeLite } from './Code/CodeBlock'
import { useStyles as useMarkdownStyles } from './markdown.style'
import { rehypeKatexDir } from './plugins/katexDir'
import { useStyles } from './style'

export interface MarkdownProps {
  allowHtml?: boolean
  children: string
  className?: string
  enableImageGallery?: boolean
  enableLatex?: boolean
  enableMermaid?: boolean
  fullFeaturedCodeBlock?: boolean
  onDoubleClick?: () => void
  rehypePlugins?: Pluggable[]
  remarkPlugins?: Pluggable[]
  remarkPluginsAhead?: Pluggable[]
  showFootnotes?: boolean
  style?: CSSProperties
  variant?: 'normal' | 'chat'
  fontSize?: number
  headerMultiple?: number
  lineHeight?: number
  marginMultiple?: number
}

const Markdown = memo<MarkdownProps>(
  ({
    children,
    className,
    style,
    onDoubleClick,
    enableLatex = true,
    enableMermaid = true,
    allowHtml,
    variant = 'normal',
    rehypePlugins,
    remarkPlugins,
    remarkPluginsAhead,
    ...rest
  }) => {
    const { cx, styles } = useStyles({ fontSize: 16 })
    const { styles: mdStyles } = useMarkdownStyles({ fontSize: 16 })

    const isChatMode = variant === 'chat'

    const memoComponents: Components = useMemo(
      () => ({
        a: (props: any) => (
          <a
            {...props}
            target={'_blank'}
          />
        ),
        // img: enableImageGallery
        //   ? (props: any) => (
        //     <Image
        //       {...props}
        //       {...componentProps?.img}
        //       style={
        //         isChatMode
        //           ? { height: 'auto', maxWidth: 640, ...componentProps?.img?.style }
        //           : componentProps?.img?.style
        //       }
        //     />
        //   )
        //   : undefined,
        pre: (props: any) => (
          <CodeLite
            enableMermaid={enableMermaid}
            {...props}
          />
        ),
        section: (props: any) => <section {...props} />
        // video: (props: any) => <Video {...props} {...componentProps?.video} />
      }),
      []
    ) as Components

    const innerRehypePlugins = Array.isArray(rehypePlugins) ? rehypePlugins : [rehypePlugins]

    const memoRehypePlugins = useMemo(
      () => [allowHtml && rehypeRaw, enableLatex && rehypeKatex, enableLatex && rehypeKatexDir, ...innerRehypePlugins].filter(Boolean) as any,
      [allowHtml, enableLatex, ...innerRehypePlugins]
    )

    const innerRemarkPlugins = Array.isArray(remarkPlugins) ? remarkPlugins : [remarkPlugins]
    const innerRemarkPluginsAhead = Array.isArray(remarkPluginsAhead) ? remarkPluginsAhead : [remarkPluginsAhead]

    const memoRemarkPlugins = useMemo(
      () =>
        [...innerRemarkPluginsAhead, remarkGfm, enableLatex && remarkMath, isChatMode && remarkBreaks, ...innerRemarkPlugins].filter(Boolean) as any,
      [isChatMode, enableLatex, ...innerRemarkPluginsAhead, ...innerRemarkPlugins]
    )

    return (
      <div
        className={`${cx(styles.root, className)} message-markdown`}
        data-code-type="markdown"
        onDoubleClick={onDoubleClick}
        style={style}
      >
        <ReactMarkdown
          className={cx(
            mdStyles.__root,
            mdStyles.a,
            mdStyles.blockquote,
            mdStyles.code,
            mdStyles.details,
            mdStyles.header,
            mdStyles.hr,
            mdStyles.img,
            mdStyles.kbd,
            mdStyles.list,
            mdStyles.p,
            mdStyles.pre,
            mdStyles.strong,
            mdStyles.table,
            mdStyles.video,
            enableLatex && styles.latex,
            isChatMode && styles.chat
          )}
          components={memoComponents}
          rehypePlugins={memoRehypePlugins}
          remarkPlugins={memoRemarkPlugins}
          {...rest}
        >
          {children}
        </ReactMarkdown>
      </div>
    )
  }
)

export default Markdown
