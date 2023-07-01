import {BlockQuoteNode, ElementProps} from '../../el'
import {useMemo} from 'react'
import {useEditorStore} from '../store'
export function Blockquote(props: ElementProps<BlockQuoteNode>) {
  const store = useEditorStore()
  return useMemo(() => (
    <blockquote
      data-be={'code-line'}
      {...props.attributes}
    >
      {props.children}
    </blockquote>
  ),[props.element.children, store.refreshHighlight])
}
