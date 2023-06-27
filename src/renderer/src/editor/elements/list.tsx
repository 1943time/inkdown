import {ElementProps, ListItemNode, ListNode} from '../../el'
import {createElement, useMemo} from 'react'
import {useMEditor} from '../../hooks/editor'
import {Checkbox} from 'antd'

export function List({element, attributes, children}: ElementProps<ListNode>) {
  const tag = element.order ? 'ol' : 'ul'
  return useMemo(() => {
    return createElement(tag, {...attributes, className: 'm-list', ['data-be']: 'list'}, children)
  }, [element, element.children])
}

export function ListItem({element, children, attributes}: ElementProps<ListItemNode>) {
  const [, update] = useMEditor(element)
  const isTask = typeof element.checked === 'boolean'
  return useMemo(() => (
    <li
      className={`m-list-item ${isTask ? 'task' : ''}`}
      data-be={'list-item'}
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
  ), [element, element.children])
}
