import React, {createElement, useMemo, useRef} from 'react'
import {useMEditor} from '../../hooks/editor'
import {Checkbox} from 'antd'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../../store/editor'
import {ElementProps, ListItemNode, ListNode} from '../../types/el'

export function List({element, attributes, children}: ElementProps<ListNode>) {
  const store = useEditorStore()
  return useMemo(() => {
    const tag = element.order ? 'ol' : 'ul'
    return (
      <div
        className={'relative'}
        data-be={'list'}
        {...attributes}
        onDragStart={store.dragStart}
      >
        {createElement(tag, {className: 'm-list', start: element.start, ['data-task']: element.task ? 'true' : undefined}, children)}
      </div>
    )
  }, [element.task, element.order, element.start, element.children])
}

export const ListItem = observer(({element, children, attributes}: ElementProps<ListItemNode>) => {
  const [, update] = useMEditor(element)
  const store = useEditorStore()
  const isTask = typeof element.checked === 'boolean'
  return useMemo(() => (
    <li
      className={`m-list-item ${isTask ? 'task' : ''}`}
      data-be={'list-item'}
      onDragStart={e => store.dragStart(e)}
      {...attributes}>
      {isTask &&
        <span contentEditable={false} className={'check-item'}>
          <Checkbox
            checked={element.checked}
            onChange={e => update({checked: e.target.checked})}
          />
        </span>
      }
      {children}
    </li>
  ), [element, element.children, store.refreshHighlight])
})
