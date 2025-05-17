import { memo, useEffect, useMemo, useState } from 'react'
import { bundledLanguages, codeToHtml } from 'shiki'

import { useStyles } from './style'
import { useThemeMode } from 'antd-style'
export const FALLBACK_LANG = 'txt'

const langMap = new Set(Object.keys(bundledLanguages))
export interface SyntaxHighlighterProps {
  children: string
  enableTransformer?: boolean
  language: string
}

const SyntaxHighlighter = memo<SyntaxHighlighterProps>(({ children, language }) => {
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
      className={cx(styles.shiki)}
      dangerouslySetInnerHTML={{
        __html: dom as string
      }}
      dir="ltr"
    />
  )
})

export default SyntaxHighlighter
