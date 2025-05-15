import { CopyButton, Icon, Markdown } from '@lobehub/ui'
import { createStyles } from 'antd-style'
import { AnimatePresence, motion } from 'framer-motion'
import { AtomIcon, ChevronDown, ChevronRight } from 'lucide-react'
import { rgba } from 'polished'
import { CSSProperties, memo, useEffect, useState } from 'react'
import { Flexbox } from 'react-layout-kit'
import { CitationItem } from '@lobehub/ui/es/types/citation'
import { useTranslation } from 'react-i18next'

const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  container: css`
    width: fit-content;
    padding-block: 4px;
    padding-inline: 8px;
    border-radius: 6px;

    color: ${token.colorTextTertiary};

    &:hover {
      background: ${isDarkMode ? token.colorFillQuaternary : token.colorFillTertiary};
    }
  `,
  expand: css`
    background: ${isDarkMode ? token.colorFillQuaternary : token.colorFillTertiary} !important;
  `,
  shinyText: css`
    color: ${rgba(token.colorText, 0.45)};

    background: linear-gradient(
      120deg,
      ${rgba(token.colorTextBase, 0)} 40%,
      ${token.colorTextSecondary} 50%,
      ${rgba(token.colorTextBase, 0)} 60%
    );
    background-clip: text;
    background-size: 200% 100%;

    animation: shine 1.5s linear infinite;

    @keyframes shine {
      0% {
        background-position: 100%;
      }

      100% {
        background-position: -100%;
      }
    }
  `,
  title: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;

    font-size: 12px;
    text-overflow: ellipsis;
  `
}))

interface ThinkingProps {
  citations?: CitationItem[]
  content?: string
  duration?: number
  style?: CSSProperties
  thinking?: boolean
}

export const Thinking = memo<ThinkingProps>(({ content, duration, thinking, style, citations }) => {
  const { styles, cx } = useStyles()
  const { t } = useTranslation()

  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    setShowDetail(!!thinking)
  }, [thinking])

  return (
    <Flexbox
      className={cx(styles.container, showDetail && styles.expand)}
      gap={16}
      style={{
        ...style,
        fontSize: '0.9em'
      }}
    >
      <div
        className={'flex items-center justify-between'}
        onClick={() => {
          setShowDetail(!showDetail)
        }}
        style={{ cursor: 'pointer' }}
      >
        {thinking ? (
          <Flexbox align={'center'} gap={8} horizontal>
            <Icon icon={AtomIcon} />
            <Flexbox className={styles.shinyText} horizontal>
              {t('reasoning.thinking')}
            </Flexbox>
          </Flexbox>
        ) : (
          <Flexbox align={'center'} gap={8} horizontal>
            <Icon icon={AtomIcon} />
            <Flexbox>
              {!duration
                ? t('reasoning.hasThought')
                : t('reasoning.hasThoughtWithDuration', {
                    duration: ((duration || 0) / 1000).toFixed(1)
                  })}
            </Flexbox>
          </Flexbox>
        )}
        <Flexbox gap={4} horizontal>
          {showDetail && content && (
            <div
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <CopyButton content={content} size={'small'} title={t('reasoning.copy')} />
            </div>
          )}
          <Icon icon={showDetail ? ChevronDown : ChevronRight} />
        </Flexbox>
      </div>

      <AnimatePresence initial={false}>
        {showDetail && (
          <motion.div
            animate="open"
            exit="collapsed"
            initial="collapsed"
            style={{ overflow: 'hidden' }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1] // 使用 ease-out 缓动函数
            }}
            variants={{
              collapsed: { height: 0, opacity: 0, width: 'auto' },
              open: { height: 'auto', opacity: 1, width: 'auto' }
            }}
          >
            {typeof content === 'string' ? (
              <Markdown citations={citations} variant={'chat'}>
                {content}
              </Markdown>
            ) : (
              content
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Flexbox>
  )
})

interface ReasoningProps {
  content?: string
  duration?: number
  thinking?: boolean
}

export const Reasoning = memo<ReasoningProps>(({ content = '', duration, thinking }) => {
  return <Thinking content={content} duration={duration} thinking={thinking} />
})
