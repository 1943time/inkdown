import {RenderElementProps} from 'slate-react/dist/components/editable'
import {useCallback, useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {MainApi} from '../../api/main'
import {DragHandle} from '../tools/DragHandle'

export function TableCell(props: RenderElementProps) {
  const store = useEditorStore()
  const context = useCallback(() => {
    MainApi.tableMenu()
  }, [])
  return useMemo(() => {
    return props.element.title ? (
      <th
        {...props.attributes} style={{textAlign: props.element.align}} data-be={'th'}
        onContextMenu={context}
      >
        {props.children}
      </th>
    ) : (
      <td
        {...props.attributes} style={{textAlign: props.element.align}} data-be={'td'}
        onContextMenu={context}
      >
        {props.children}
      </td>
    )
  }, [props.element, props.element.children, store.refreshHighlight])
}

export const Table = observer((props: RenderElementProps) => {
  const store = useEditorStore()
  return useMemo(() => {
    return (
      <div className={'m-table drag-el'} {...props.attributes} data-be={'table'} onDragStart={store.dragStart}>
        <DragHandle style={{top: '0.65em'}}/>
        <table>
          <tbody>{props.children}</tbody>
        </table>
      </div>
    )}, [
    props.element, props.element.children
  ])
})
