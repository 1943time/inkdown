import {ElementProps, HeadNode} from '../../el'
import {createElement, useMemo} from 'react'
import {useEditorStore} from '../store'
import {DragHandle} from '../tools/DragHandle'
import {Node} from 'slate'
import {slugify} from '../utils/dom'
import {useSelStatus} from '../../hooks/editor'

const levelDragHandleTop = new Map([
  [1, 0.52],
  [2, 0.45],
  [3, 0.33],
  [4, 0.25],
  [5, 0.25]
])
export function Head({element, attributes, children}: ElementProps<HeadNode>) {
  const store = useEditorStore()
  const [selected, path] = useSelStatus(element)
  return useMemo(() => {
    const str = Node.string(element)
    return createElement(`h${element.level}`, {
      ...attributes,
      ['data-be']: 'head',
      className: 'drag-el',
      ['data-head']: slugify(Node.string(element) || ''),
      ['data-title']: path?.[0] === 0,
      onDragStart: store.dragStart,
      ['data-empty']: !str && selected ? 'true' : undefined
    }, (
      <>
        <DragHandle style={{left: -28, paddingRight: 10}}/>
        {children}
      </>
    ))
  }, [element, element.children, store.refreshHighlight, selected, path])
}
