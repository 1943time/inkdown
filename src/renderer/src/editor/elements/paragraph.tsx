import {CodeLineNode, ElementProps} from '../../el'
import {useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'

export const Paragraph = observer((props: ElementProps<CodeLineNode>) => {
  const store = useEditorStore()
  return useMemo(() => (
      <p {...props.attributes} data-be={'paragraph'}>
        {props.children}
      </p>
    ),
    [props.element, props.element.children, store.refreshHighlight])
})
