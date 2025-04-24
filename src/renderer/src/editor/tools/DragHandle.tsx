import { CSSProperties, memo, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import { useTab } from '@/store/note/TabCtx'

export const DragHandle = memo((props: { style?: CSSProperties }) => {
  const ref = useRef<HTMLDivElement>(null)
  const tab = useTab()
  return (
    <span
      className={'drag-handle'}
      tabIndex={-1}
      style={{ ...props.style }}
      ref={ref}
      onMouseDown={(e) => {
        let parent = ref.current!.parentElement!
        if (parent.parentElement?.dataset.be === 'list-item') {
          if (
            !parent.previousSibling ||
            (parent.previousSibling as HTMLElement).classList.contains('check-item')
          ) {
            parent = parent.parentElement
          }
        }
        tab.dragEl = parent
        tab.editor.selection = null

        tab.selChange$.next(null)
        tab.dragStart(e)
        e.stopPropagation()
      }}
    >
      <GripVertical className={'drag-icon'} />
    </span>
  )
})
