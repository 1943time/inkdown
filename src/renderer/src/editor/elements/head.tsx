import { createElement, useMemo } from 'react'
import { DragHandle } from '../tools/DragHandle'
import { Node } from 'slate'
import { slugify } from '../utils/dom'
import { ElementProps, HeadNode } from '..'
import { useSelStatus } from '../utils'

export function Head({ element, attributes, children }: ElementProps<HeadNode>) {
  const [selected, path] = useSelStatus(element)
  const str = Node.string(element)
  return createElement(
    `h${element.level}`,
    {
      ...attributes,
      ['data-be']: 'head',
      className: 'drag-el',
      ['data-head']: slugify(Node.string(element) || ''),
      ['data-title']: path?.[0] === 0,
      ['data-empty']: !str && selected && element.children?.length === 1 ? 'true' : undefined
    },
    <>
      <DragHandle style={{ left: -28, paddingRight: 10 }} />
      {children}
    </>
  )
}
