import {CodeLineNode, ElementProps} from '../../el'
import {useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {DragHandle} from '../tools/DragHandle'

export const Paragraph = observer((props: ElementProps<CodeLineNode>) => {
  const store = useEditorStore()
  return useMemo(() => (
      <p
        {...props.attributes} data-be={'paragraph'} className={'drag-el'}
        onDragStart={store.dragStart}
      >
        <DragHandle style={{left: -20}} top={0.3125}/>
        {props.children}
      </p>
    ),
    [props.element, props.element.children, store.refreshHighlight])
})
