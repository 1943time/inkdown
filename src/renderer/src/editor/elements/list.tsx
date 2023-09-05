import {ElementProps, ListItemNode, ListNode} from '../../el'
import React, {createElement, useMemo, useRef} from 'react'
import {useMEditor} from '../../hooks/editor'
import {Checkbox} from 'antd'
import {useEditorStore} from '../store'
import {observer} from 'mobx-react-lite'
import Drag from '../../icons/Drag'
import {configStore} from '../../store/config'

export const List = observer(({element, attributes, children}: ElementProps<ListNode>) => {
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
        {configStore.config.dragToSort &&
          <span
            className={'block absolute top-[5px] w-5 group hover:border-r dark:border-gray-200/10 border-gray-200 h-[calc(100%_-_10px)]'}
            style={{
              paddingTop: '.3em',
              left: -36
            }}
          >
            <Drag
              onMouseDown={e => {
                const target = e.target as HTMLElement
                const ul = target.parentElement!.parentElement!
                ul.draggable = true
                store.dragEl = ul
              }}
              className={'drag-icon opacity-0 group-hover:opacity-100'}
            />
          </span>
        }
        {createElement(tag, {className: 'm-list'}, children)}
      </div>
    )
  }, [element, element.children, configStore.config.dragToSort])
})

export const ListItem = observer(({element, children, attributes}: ElementProps<ListItemNode>) => {
  const [, update] = useMEditor(element)
  const store = useEditorStore()
  const isTask = typeof element.checked === 'boolean'
  return useMemo(() => (
    <li
      className={`m-list-item ${isTask ? 'task' : ''}`}
      data-be={'list-item'}
      onDragStart={e => store.dragStart(e, 'list-item')}
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
