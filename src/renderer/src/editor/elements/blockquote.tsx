import {BlockQuoteNode, ElementProps} from '../../el'
import {useMemo} from 'react'
import {useEditorStore} from '../store'
import {getVisibleStyle, useMonitorHeight} from '../plugins/elHeight'
export function Blockquote(props: ElementProps<BlockQuoteNode>) {
  const store = useEditorStore()
  useMonitorHeight(store, props.element)
  return useMemo(() => (
    <blockquote
      data-be={'blockquote'}
      {...props.attributes}
      style={{...getVisibleStyle(props.element)}}
    >
      {props.children}
    </blockquote>
  ),[props.element.children, store.refreshHighlight])
}
