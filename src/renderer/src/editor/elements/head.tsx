import {ElementProps, HeadNode} from '../../el'
import {createElement, useMemo} from 'react'
import {useEditorStore} from '../store'
import {DragHandle} from '../tools/DragHandle'
import {Node} from 'slate'

const levelDragHandleTop = new Map([
  [1, 0.52],
  [2, 0.45],
  [3, 0.33],
  [4, 0.25],
  [5, 0.25]
])
export function Head({element, attributes, children}: ElementProps<HeadNode>) {
  const store = useEditorStore()
  return useMemo(() => {
    return createElement(`h${element.level}`, {
      ...attributes,
      ['data-be']: 'head',
      className: 'drag-el',
      ['data-head']: Node.string(element) || '',
      onDragStart: store.dragStart
    }, (
      <>
        <DragHandle style={{left: -28, paddingRight: 10}} top={levelDragHandleTop.get(element.level)!}/>
        {children}
      </>
    ))
  }, [element, element.children, store.refreshHighlight])
}
