import { useCallback, useEffect, useRef, useState } from 'react'
import { DragHandle } from '../tools/DragHandle'
import { Editor, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { ElementProps, TableCellNode, TableNode } from '..'
import { useTab } from '@/store/note/TabCtx'
import { Ellipsis } from 'lucide-react'
import { useGetSetState } from 'react-use'
import { useShallow } from 'zustand/react/shallow'

export function TableCell({ element, children, attributes }: ElementProps<TableCellNode>) {
  const tab = useTab()
  const [showMenu, setShowMenu] = useState(false)
  const startedMove = tab.table.useState((state) => state.startedMove)
  return element.title ? (
    <th
      {...attributes}
      style={{
        textAlign: element.align,
        minWidth: element.width || 180,
        maxWidth: element.width || 180
      }}
      data-be={'th'}
      className={'group'}
    >
      <div>{children}</div>
      <div
        className={'col-move select-none'}
        tabIndex={-1}
        onMouseEnter={tab.table.hoverMark}
        onMouseLeave={tab.table.leaveMark}
        onMouseDown={tab.table.startMove}
        contentEditable={false}
      ></div>
      {!startedMove && (
        <div
          className={`t-more ${showMenu ? 'flex' : 'hidden group-hover:flex'}`}
          contentEditable={false}
          onClick={(e) => {
            setShowMenu(true)
            Transforms.select(
              tab.editor,
              Editor.end(tab.editor, ReactEditor.findPath(tab.editor, element))
            )
            tab.table.openTableMenus(e, true, () => setShowMenu(false))
          }}
        >
          <Ellipsis />
        </div>
      )}
    </th>
  ) : (
    <td
      {...attributes}
      style={{
        textAlign: element.align,
        minWidth: element.width || 180,
        maxWidth: element.width || 180
      }}
      data-be={'td'}
      className={'group'}
    >
      <div>{children}</div>
      <div
        className={'col-move select-none'}
        tabIndex={-1}
        contentEditable={false}
        onMouseDown={tab.table.startMove}
        onMouseEnter={tab.table.hoverMark}
        onMouseLeave={tab.table.leaveMark}
      ></div>
      {!startedMove && (
        <div
          className={`t-more ${showMenu ? 'flex' : 'hidden group-hover:flex'}`}
          contentEditable={false}
          onClick={(e) => {
            setShowMenu(true)
            Transforms.select(
              tab.editor,
              Editor.end(tab.editor, ReactEditor.findPath(tab.editor, element))
            )
            tab.table.openTableMenus(e, false, () => setShowMenu(false))
          }}
        >
          <Ellipsis />
        </div>
      )}
    </td>
  )
}

export function Table({ element, children, attributes }: ElementProps<TableNode>) {
  const tab = useTab()
  const timer = useRef(0)
  const domRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useGetSetState({
    floatRight: false,
    floatLeft: false,
    enter: false
  })
  const [showMoveMark, startedMove, moveLeft] = tab.table.useState(
    useShallow((state) => [state.showMoveMark, state.startedMove, state.moveLeft])
  )
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
  }, [element])
  return (
    <div
      className={'relative m-table drag-el'}
      {...attributes}
      data-be={'table'}
      onMouseEnter={(e) => setState({ enter: true })}
      onMouseLeave={(e) => setState({ enter: false })}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      onDragStart={tab.dragStart}
    >
      <DragHandle />
      <div className={`overflow-x-auto w-full tb relative`} ref={domRef}>
        <table className={'w-auto'} onMouseDown={(e) => e.stopPropagation()}>
          <tbody>{children}</tbody>
        </table>
        {state().enter && (showMoveMark || startedMove) && (
          <div className={'col-move-mark'} style={{ left: moveLeft }} contentEditable={false} />
        )}
      </div>
      <div
        className={`fs-right ${state().floatRight ? 'opacity-100' : 'opacity-0'}`}
        contentEditable={false}
      />
      <div
        className={`fs-left ${state().floatLeft ? 'opacity-100' : 'opacity-0'}`}
        contentEditable={false}
      />
    </div>
  )
}
