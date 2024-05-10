import {observer} from 'mobx-react-lite'
import React, {CSSProperties, useRef} from 'react'
import Drag from '../../icons/Drag'
import {useEditorStore} from '../store'
import {configStore} from '../../store/config'


export const DragHandle = observer((props: {
  style?: CSSProperties,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const store = useEditorStore()
  if (!configStore.config.dragToSort) return null
  return (
    <span
      className={'drag-handle'}
      style={{...props.style,}}
      contentEditable={false}
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
