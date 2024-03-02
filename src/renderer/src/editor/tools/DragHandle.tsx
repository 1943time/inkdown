import {observer} from 'mobx-react-lite'
import React, {CSSProperties, ReactNode, useCallback, useEffect, useRef} from 'react'
import Drag from '../../icons/Drag'
import {useEditorStore} from '../store'
import {configStore} from '../../store/config'


export const DragHandle = observer((props: {
  style?: CSSProperties,
  // top: number
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const store = useEditorStore()
  // const transformHandelTop = useCallback((value: number) => {
  //   if (configStore.config.editorLineHeight === 'compact') return value - 0.1
  //   if (configStore.config.editorLineHeight === 'loose') return value + 0.15
  //   return value
  // }, [configStore.config.editorLineHeight])
  if (!configStore.config.dragToSort) return null
  return (
    <span
      className={'drag-handle'}
      style={{
        ...props.style,
        // top: transformHandelTop(props.top) + 'em'
      }}
      ref={ref}
      onMouseDown={(e) => {
        let parent = ref.current!.parentElement!
        if (parent.parentElement?.dataset.be === 'list-item') {
          if (!parent.previousSibling || (parent.previousSibling as HTMLElement).classList.contains('check-item')) {
            parent = parent.parentElement
          }
        }
        parent.draggable = true
        store.dragEl = parent
      }}
    >
      <Drag
        className={'drag-icon'}
      />
    </span>
  )
})
