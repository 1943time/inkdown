import { RenderElementProps } from 'slate-react/dist/components/editable'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { DragHandle } from '../tools/DragHandle'
import { useEditorStore } from '../../store/editor'
import { Editor, Transforms } from 'slate'
import { useLocalState } from '../../hooks/useLocalState'
import { IMore } from '../../icons/IMore'
import { ReactEditor } from 'slate-react'

export const TableCell = observer((props: RenderElementProps) => {
  const store = useEditorStore()
  const [showMenu, setShowMenu] = useState(false)
  return useMemo(() => {
    return props.element.title ? (
      <th
        {...props.attributes}
        style={{
          textAlign: props.element.align,
          minWidth: props.element.width || 180,
          maxWidth: props.element.width || 180
        }}
        data-be={'th'}
        className={'group'}
      >
        <div>{props.children}</div>
        <div
          className={'col-move select-none'}
          tabIndex={-1}
          onMouseEnter={store.table.hoverMark}
          onMouseLeave={store.table.leaveMark}
          onMouseDown={store.table.startMove}
          contentEditable={false}
        ></div>
        {!store.table.startedMove && (
          <div
            className={`t-more ${showMenu ? 'flex' : 'hidden group-hover:flex'}`}
            contentEditable={false}
            onClick={(e) => {
              setShowMenu(true)
              Transforms.select(
                store.editor,
                Editor.end(store.editor, ReactEditor.findPath(store.editor, props.element))
              )
              store.table.openTableMenus(e, true, () => setShowMenu(false))
            }}
          >
            <IMore />
          </div>
        )}
      </th>
    ) : (
      <td
        {...props.attributes}
        style={{
          textAlign: props.element.align,
          minWidth: props.element.width || 180,
          maxWidth: props.element.width || 180
        }}
        data-be={'td'}
        className={'group'}
      >
        <div>{props.children}</div>
        <div
          className={'col-move select-none'}
          tabIndex={-1}
          contentEditable={false}
          onMouseDown={store.table.startMove}
          onMouseEnter={store.table.hoverMark}
          onMouseLeave={store.table.leaveMark}
        ></div>
        {!store.table.startedMove && (
          <div
            className={`t-more ${showMenu ? 'flex' : 'hidden group-hover:flex'}`}
            contentEditable={false}
            onClick={(e) => {
              setShowMenu(true)
              Transforms.select(
                store.editor,
                Editor.end(store.editor, ReactEditor.findPath(store.editor, props.element))
              )
              store.table.openTableMenus(e, false, () => setShowMenu(false))
            }}
          >
            <IMore />
          </div>
        )}
      </td>
    )
  }, [props.element, props.element.children, store.refreshHighlight, showMenu, store.table.startedMove])
})

export const Table = observer((props: RenderElementProps) => {
  const store = useEditorStore()
  const timer = useRef(0)
  const domRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useLocalState({
    floatRight: false,
    floatLeft: false,
    enter: false
  })
  const scroll = useCallback(() => {
    const dom = domRef.current
    if (dom) {
      const t = dom.querySelector('table')!
      if (dom.scrollLeft + dom.clientWidth < t.clientWidth) {
        setState({ floatRight: true })
      } else {
        setState({ floatRight: false })
      }
      setState({ floatLeft: dom.scrollLeft > 0 })
    }
  }, [])
  useEffect(() => {
    scroll()
    domRef.current?.addEventListener('scroll', scroll, { passive: true })
    return () => {
      domRef.current?.removeEventListener('scroll', scroll)
    }
  }, [])
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      scroll()
    }, 30)
  }, [props.element, store.table.startedMove])
  return useMemo(() => {
    return (
      <div
        className={'relative m-table drag-el'}
        {...props.attributes}
        data-be={'table'}
        onMouseEnter={(e) => setState({ enter: true })}
        onMouseLeave={(e) => setState({ enter: false })}
        onMouseDown={(e) => {
          e.preventDefault()
        }}
        onDragStart={store.dragStart}
      >
        <DragHandle />
        <div className={`overflow-x-auto w-full tb relative`} ref={domRef}>
          <table className={'w-auto'} onMouseDown={(e) => e.stopPropagation()}>
            <tbody>{props.children}</tbody>
          </table>
          {state.enter && (store.table.showMoveMark || store.table.startedMove) && (
            <div
              className={'col-move-mark'}
              style={{ left: store.table.moveLeft }}
              contentEditable={false}
            />
          )}
        </div>
        <div
          className={`fs-right ${state.floatRight ? 'opacity-100' : 'opacity-0'}`}
          contentEditable={false}
        />
        <div
          className={`fs-left ${state.floatLeft ? 'opacity-100' : 'opacity-0'}`}
          contentEditable={false}
        />
      </div>
    )
  }, [
    props.element.children,
    state.floatRight,
    state.floatLeft,
    store.table.moveLeft,
    store.table.showMoveMark,
    store.table.startedMove,
    state.enter
  ])
})
