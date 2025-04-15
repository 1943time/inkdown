import React, { createElement, useMemo, useRef } from 'react'
import { Checkbox } from 'antd'
import { ElementProps, ListItemNode, ListNode } from '..'
import { useTab } from '@/store/note/TabCtx'
import { useMEditor } from '../utils'

export function List({ element, attributes, children }: ElementProps<ListNode>) {
  const tab = useTab()
  const tag = element.order ? 'ol' : 'ul'
  return (
    <div className={'relative'} data-be={'list'} {...attributes} onDragStart={tab.dragStart}>
      {createElement(
        tag,
        {
          className: 'm-list',
          start: element.start,
          ['data-task']: element.task ? 'true' : undefined
        },
        children
      )}
    </div>
  )
}

export function ListItem({ element, children, attributes }: ElementProps<ListItemNode>) {
  const tab = useTab()
  const [, update] = useMEditor(element)
  const isTask = typeof element.checked === 'boolean'
  return (
    <li
      className={`m-list-item ${isTask ? 'task' : ''}`}
      data-be={'list-item'}
      onDragStart={(e) => tab.dragStart(e)}
      {...attributes}
    >
      {isTask && (
        <span contentEditable={false} className={'check-item'}>
          <Checkbox
            checked={element.checked}
            onChange={(e) => update({ checked: e.target.checked })}
          />
        </span>
      )}
      {children}
    </li>
  )
}
