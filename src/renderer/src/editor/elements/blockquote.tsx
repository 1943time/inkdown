import {BlockQuoteNode, ElementProps} from '../../el'
import {useMemo} from 'react'
export function Blockquote(props: ElementProps<BlockQuoteNode>) {
  return useMemo(() => (
    <blockquote
      data-be={'code-line'}
      {...props.attributes}
    >
      {props.children}
    </blockquote>
  ),[props.element.children])
}
