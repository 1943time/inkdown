import React, { CSSProperties, useCallback, useEffect, useRef } from 'react'
import isHotkey from 'is-hotkey'
import { useLocalState } from '@/hooks/useLocalState'
import { observer } from 'mobx-react-lite'

interface ScrollListProps<T> {
  items: T[]
  style?: CSSProperties
  renderItem: (item: T, index: number) => React.ReactNode
  onSelect?: (item: T, index: number, mod?: boolean) => void
  className?: string
  onClose?: () => void
  onTab?: (item: T, index: number) => void
}

export const ScrollList = observer(
  <T,>({
    items,
    style,
    renderItem,
    onSelect,
    className = '',
    onClose,
    onTab
  }: ScrollListProps<T>) => {
    const [state, setState] = useLocalState({
      activeIndex: 0
    })
    const scrollRef = useRef<HTMLDivElement>(null)

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (['ArrowDown', 'ArrowUp'].includes(e.key) && items.length > 1) {
          e.preventDefault()
          if (e.key === 'ArrowDown') {
            const index = state.activeIndex === items.length - 1 ? 0 : state.activeIndex + 1
            setState({ activeIndex: index })
          }
          if (e.key === 'ArrowUp') {
            const index = state.activeIndex === 0 ? items.length - 1 : state.activeIndex - 1
            setState({ activeIndex: index })
          }

          const target = scrollRef.current?.children[state.activeIndex] as HTMLDivElement
          if (target && scrollRef.current) {
            const { scrollTop, clientHeight } = scrollRef.current
            if (target.offsetTop > scrollTop + clientHeight - target.offsetHeight) {
              scrollRef.current.scroll({
                top: target.offsetTop - clientHeight + target.clientHeight + 60,
                behavior: 'instant'
              })
            }
            if (target.offsetTop < scrollTop) {
              scrollRef.current.scroll({
                top: target.offsetTop - 60,
                behavior: 'instant'
              })
            }
          }
        }

        if (items.length && (isHotkey('enter', e) || isHotkey('mod+enter', e))) {
          e.preventDefault()
          onSelect?.(items[state.activeIndex], state.activeIndex, e.ctrlKey || e.metaKey)
        }
        if (items.length && isHotkey('tab', e)) {
          e.preventDefault()
          onTab?.(items[state.activeIndex], state.activeIndex)
        }
        if (isHotkey('esc', e)) {
          e.preventDefault()
          onClose?.()
        }
      },
      [items, onSelect, onClose]
    )
    useEffect(() => {
      setState({ activeIndex: 0 })
    }, [items])
    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }, [items, onSelect, onClose])
    return (
      <div ref={scrollRef} style={style} className={`overflow-y-auto relative ${className}`}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`rounded-sm ${state.activeIndex === index ? 'bg-gray-200/60 dark:bg-gray-200/10' : ''}`}
            onMouseEnter={() => {
              setState({ activeIndex: index })
            }}
            onClick={(e) => {
              setState({ activeIndex: index })
              onSelect?.(item, index, e.ctrlKey || e.metaKey)
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    )
  }
)
