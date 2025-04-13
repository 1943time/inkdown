import {useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {DragHandle} from '../tools/DragHandle'
import {useSelStatus} from '../../hooks/editor'
import {Node} from 'slate'
import {useEditorStore} from '../../store/editor'
import {ElementProps, ParagraphNode} from '../../types/el'

export const Paragraph = observer((props: ElementProps<ParagraphNode>) => {
  const store = useEditorStore()
  const [selected] = useSelStatus(props.element)
  return useMemo(() => {
    const str = Node.string(props.element)
    return (
      <p
        {...props.attributes} data-be={'paragraph'} className={'drag-el'}
        onDragStart={store.dragStart}
        data-empty={!str && selected ? 'true' : undefined}
      >
        <DragHandle style={{left: -20}}/>
        {props.children}
      </p>
    )},[props.element.children, store.refreshHighlight, selected])
})
