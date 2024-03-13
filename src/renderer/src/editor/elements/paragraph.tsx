import {CodeLineNode, ElementProps, ParagraphNode} from '../../el'
import {useLayoutEffect, useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {DragHandle} from '../tools/DragHandle'
import {useSelStatus} from '../../hooks/editor'
import {Node} from 'slate'
import {getVisibleStyle, useMonitorHeight} from '../plugins/elHeight'

export const Paragraph = observer((props: ElementProps<ParagraphNode>) => {
  const store = useEditorStore()
  const [selected] = useSelStatus(props.element)
  useMonitorHeight(store, props.element)
  return useMemo(() => {
    const str = Node.string(props.element)
    return (
      <p
        {...props.attributes} data-be={'paragraph'} className={'drag-el'}
        onDragStart={store.dragStart}
        style={{...getVisibleStyle(props.element)}}
        data-empty={!str && selected ? 'true' : undefined}
      >
        <DragHandle style={{left: -20}}/>
        {props.children}
      </p>
    )},[props.element.children, store.refreshHighlight, selected])
})
