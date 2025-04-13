import {useMemo} from 'react'
import {BlockQuoteNode, ElementProps} from '../../types/el'
import {useEditorStore} from '../../store/editor'
export function Blockquote(props: ElementProps<BlockQuoteNode>) {
  const store = useEditorStore()
  return useMemo(() => (
    <blockquote
      data-be={'blockquote'}
      {...props.attributes}
    >
      {props.children}
    </blockquote>
  ),[props.element.children, store.refreshHighlight])
}
