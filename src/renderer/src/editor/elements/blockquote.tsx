import { memo } from 'react'
import { BlockQuoteNode, ElementProps } from '..'
export function Blockquote(props: ElementProps<BlockQuoteNode>) {
  return (
    <blockquote data-be={'blockquote'} {...props.attributes}>
      {props.children}
    </blockquote>
  )
}
