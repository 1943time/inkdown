import {RenderElementProps} from 'slate-react/dist/components/editable'
import {useCallback, useMemo} from 'react'
import {observer} from 'mobx-react-lite'
import {useEditorStore} from '../store'
import {MainApi} from '../../api/main'

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
  return useMemo(() => {
    return (
      <div className={'m-table'} {...props.attributes} data-be={'table'}>
        <table>
          <tbody>{props.children}</tbody>
        </table>
      </div>
    )}, [
    props.element, props.element.children
  ])
})
