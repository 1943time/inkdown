import {ElementProps, HeadNode} from '../../el'
import {createElement, useMemo} from 'react'
import {useEditorStore} from '../store'
const levelText = new Map([
  [1, 'text-2xl'],
  [2, 'text-xl'],
  [3, 'text-lg'],
  [4, 'text-base'],
  [5, 'text-base'],
  [6, 'text-base']
])
export function Head({element, attributes, children}: ElementProps<HeadNode>) {
  const store = useEditorStore()
  return useMemo(() => {
    return createElement(`h${element.level}`, {
      ...attributes,
      ['data-be']: 'head',
      className: 'group'
    }, (
      <>
        <span
          contentEditable={false}
          className={`${levelText.get(element.level)}
          absolute -left-10 dark:text-gray-600 text-gray-400 top-1/2 -translate-y-1/2 select-none hidden group-hover:block
          `}>
          h{element.level}
        </span>
        {children}
      </>
    ))
  }, [element, element.children, store.refreshHighlight])
}
