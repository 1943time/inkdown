import { DragHandle } from '../tools/DragHandle'
import { Node } from 'slate'
import { useSelStatus } from '../utils'
import { useTab } from '@/store/note/TabCtx'
import { ElementProps, ParagraphNode } from '..'

export function Paragraph(props: ElementProps<ParagraphNode>) {
  const tab = useTab()
  const [selected] = useSelStatus(props.element)
  const str = Node.string(props.element)
  return (
    <p
      {...props.attributes}
      data-be={'paragraph'}
      className={'drag-el'}
      onDragStart={tab.dragStart}
      data-empty={!str && selected && props.element.children?.length === 1 ? 'true' : undefined}
    >
      <DragHandle style={{ left: -20 }} />
      {props.children}
    </p>
  )
}
