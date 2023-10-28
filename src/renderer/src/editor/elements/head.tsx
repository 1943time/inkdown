import {ElementProps, HeadNode} from '../../el'
import {createElement, useMemo} from 'react'
import {useEditorStore} from '../store'
import {DragHandle} from '../tools/DragHandle'
import {Node} from 'slate'

const levelDragHandleTop = new Map([
  [1, '.52em'],
  [2, '.45em'],
  [3, '.33em'],
  [4, '.25em'],
  [5, '.25em']
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
        <DragHandle style={{top: levelDragHandleTop.get(element.level), left: -28, paddingRight: 10}}/>
        {children}
      </>
    ))
  }, [element, element.children, store.refreshHighlight])
}
