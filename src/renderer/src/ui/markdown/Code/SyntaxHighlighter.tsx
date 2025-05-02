import { memo, useEffect, useMemo, useState } from 'react'
import { bundledLanguages, codeToHtml } from 'shiki'

import { useStyles } from './style'
import { useThemeMode } from 'antd-style'
import { DivProps } from '@lobehub/ui'
export const FALLBACK_LANG = 'txt'

const langMap = new Set(Object.keys(bundledLanguages))
export interface SyntaxHighlighterProps extends DivProps {
  children: string
  enableTransformer?: boolean
  language: string
}

const SyntaxHighlighter = memo<SyntaxHighlighterProps>(
  ({ children, language, className, style }) => {
    const { styles, cx } = useStyles()
    const { isDarkMode } = useThemeMode()
    const lang = language?.toLowerCase()
    const [dom, setDom] = useState('')
    const matchedLanguage = useMemo(
      () => (langMap.has(language as any) ? language : FALLBACK_LANG),
      [language]
    )
    useEffect(() => {
      codeToHtml(children, {
        lang: matchedLanguage,
        theme: isDarkMode ? 'plastic' : 'github-light'
      }).then((res) => {
        setDom(res)
      })
    }, [children, lang, isDarkMode])
    return (
      <div
        className={cx(styles.shiki, className)}
        dangerouslySetInnerHTML={{
          __html: dom as string
        }}
        dir="ltr"
        style={style}
      />
    )
  }
)

export default SyntaxHighlighter
