import {ReactEditor, useSlate} from 'slate-react'
import {Editor, NodeEntry, Path, Transforms} from 'slate'
import {useGetSetState} from 'react-use'
import {Popover, Tooltip} from 'antd'
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AppstoreAddOutlined,
  DeleteOutlined, EllipsisOutlined,
} from '@ant-design/icons'
import React, {useCallback, useEffect, useRef} from 'react'
import {getOffsetLeft} from '../utils/dom'
import {useEditorStore} from '../store'
import {observer} from 'mobx-react-lite'
import isHotkey from 'is-hotkey'
import {TableCellNode, TableNode, TableRowNode} from '../../el'
import {EditorUtils} from '../utils/editorUtils'
import {useSubject} from '../../hooks/subscribe'
import { useCoreContext } from '../../store/core'

export const TableAttr = observer(() => {
  const core = useCoreContext()
  const store = useEditorStore()
  const editor = store.editor
  const [state, setState] = useGetSetState({
    visible: false,
    top: 0,
    left: 0,
    width: 0,
    scaleOpen: false,
    enterScale: false,
    align: '',
    rows: 0,
    cols: 0,
    selectCols: 0,
    selectRows: 0
  })
  const tableRef = useRef<NodeEntry<TableNode>>()
  const tableCellRef = useRef<NodeEntry<TableCellNode>>()
  const isHead = () => tableCellRef.current?.[1][tableCellRef.current?.[1].length - 2] === 0
  const resize = useCallback(() => {
    const table = tableRef.current
    if (!table) return
    setTimeout(() => {
      try {
        const dom = ReactEditor.toDOMNode(editor, table[0]) as HTMLElement
        if (dom) {
          let top = store.offsetTop(dom)
          let left = getOffsetLeft(dom)
          if (!core.tree.fold) left -= core.tree.width
          setState({
            rows: table[0].children.length,
            cols: table[0].children[0].children.length,
            top: top - 24 + 3, left,
            width: dom.clientWidth,
            visible: true
          })
        }
      } catch (e) {}
    }, 16)
  }, [])

  useEffect(() => {
    const el = store.tableCellNode
    if (el) {
      tableCellRef.current = el
      setState({align: el[0].align})
      const table = Editor.node(editor, Path.parent(Path.parent(el[1])))
      if (table && table[0] !== tableRef.current?.[0]) {
        tableRef.current = table
        resize()
      }
    } else {
      tableCellRef.current = undefined
      tableRef.current = undefined
      setState({visible: false})
    }
  }, [store.tableCellNode, store.refreshTableAttr])

  const resetGird = useCallback((row: number, col: number) => {
    store.doManual()
    setState({scaleOpen: false})
    const [table, path] = tableRef.current!
    if (state().rows > row) {
      Transforms.removeNodes(editor, {
        at: {
          anchor: {path: [...path, row], offset: 0},
          focus: {path: [...path, state().rows], offset: 0}
        },
        match: node => node.type === 'table-row'
      })
    }

    const heads = table.children[0].children as TableCellNode[] || []
    const lastIndex = heads.length
    for (let i = 0; i < row; i++) {
      const row = table.children[i]
      if (!row) {
        const row: TableRowNode = {
          type: 'table-row',
          children: Array.from(new Array(col)).map((_, j) => {
            return {type: 'table-cell', children: [], align: heads[j]?.align} as TableCellNode
          })
        }
        Transforms.insertNodes(editor, row, {
          at: [...path, i]
        })
      } else {
        if (state().cols > col) {
          Transforms.removeNodes(editor, {
            at: {
              anchor: {path: [...path, i, col], offset: 0},
              focus: {path: [...path, i, state().cols], offset: 0}
            },
            match: node => node.type === 'table-cell'
          })
        } else {
          Array.from(new Array(col - state().cols)).forEach((_, j) => {
            Transforms.insertNodes(
              editor,
              {
                type: 'table-cell',
                children: [],
                title: i === 0,
                align: heads[j + state().cols]?.align
              } as TableCellNode,
              {at: [...path, i, lastIndex + j]}
            )
          })
        }
      }
    }
    if (tableCellRef.current && !Editor.hasPath(editor, tableCellRef.current[1])) {
      Transforms.select(editor, Editor.start(editor, path))
    }
    ReactEditor.focus(editor)
  }, [editor])

  const getScaleGirdClass = useCallback((row: number, col: number) => {
    if (row === 1) {
      if (state().enterScale) {
        return col <= state().selectCols ? 'bg-gray-600' : 'bg-white'
      } else {
        return col <= state().cols ? 'bg-gray-600' : 'bg-white'
      }
    } else {
      if (state().enterScale) {
        return row <= state().selectRows && col <= state().selectCols ? 'bg-gray-400' : ''
      } else {
        return row <= state().rows && col <= state().cols ? 'bg-gray-400' : ''
      }
    }
  }, [])

  const setAligns = useCallback((type: 'left' | 'center' | 'right') => {
    const cell = tableCellRef.current!
    const table = tableRef.current!
    if (cell) {
      const index = cell[1][cell[1].length - 1]
      table[0].children.forEach((el) => {
        el.children?.forEach((cell, i) => {
          if (i === index) {
            Transforms.setNodes(editor, {align: type}, {at: EditorUtils.findPath(editor, cell)})
          }
        })
      })
    }
    ReactEditor.focus(editor)
  }, [editor])

  const remove = useCallback(() => {
    const table = tableRef.current!
    Transforms.delete(editor, {at: table[1]})
    tableCellRef.current = undefined
    tableRef.current = undefined
    Transforms.insertNodes(editor, {type: 'paragraph', children: [{text: ''}]}, {at: table[1], select: true})
    ReactEditor.focus(editor)
  }, [editor])

  useEffect(() => {
    resize()
  }, [core.tree.size, store.openSearch, core.tree.tabs.length, core.config.config.showLeading])

  const insertRow = useCallback((path: Path, columns: number) => {
    Transforms.insertNodes(editor, {
      type: 'table-row',
      children: Array.from(new Array(columns)).map(() => {
        return {type: 'table-cell', children: [{text: ''}]} as TableCellNode
      })
    }, {
      at: path
    })
    Transforms.select(editor, Editor.start(editor, path))
  }, [])

  const insertCol = useCallback((tablePath: Path, rows: number, index: number) => {
    Array.from(new Array(rows)).map((_, i) => {
      Transforms.insertNodes(editor, {
        type: 'table-cell', children: [{text: ''}], title: i === 0
      }, {
        at: [...tablePath, i, index]
      })
    })
    Transforms.select(editor, [...tablePath, 0, index, 0])
  }, [])

  const removeRow = useCallback((path: Path, index: number, columns: number) => {
    if (Path.hasPrevious(path)) {
      Transforms.select(editor, Editor.end(editor, [...tableRef.current![1], path[path.length - 1] - 1, index]))
    } else {
      Transforms.select(editor, Editor.end(editor, [...tableRef.current![1], path[path.length - 1], index]))
    }
    Transforms.delete(editor, {at: path})
    if (path[path.length - 1] === 0) {
      Array.from(new Array(columns)).map((_, i) => {
        Transforms.setNodes(editor, {
          title: true
        }, {
          at: [...path, i]
        })
      })
    }
  }, [editor])

  const task = useCallback((task: string) => {
    if (!tableCellRef.current || !tableRef.current) return
    const columns = tableRef.current[0].children[0].children.length
    const rows = tableRef.current[0].children.length
    const path = tableCellRef.current[1]
    const index = path[path.length - 1]
    const row = path[path.length - 2]
    const rowPath = Path.parent(path)
    store.doManual()
    switch (task) {
      case 'insertRowBefore':
        insertRow(row === 0 ? Path.next(Path.parent(path)) : Path.parent(path), columns)
        break
      case 'insertRowAfter':
        insertRow(Path.next(Path.parent(path)), columns)
        break
      case 'insertColBefore':
        insertCol(tableRef.current[1], rows, index)
        break
      case 'insertColAfter':
        insertCol(tableRef.current[1], rows, index + 1)
        break
      case 'insertTableCellBreak':
        Transforms.insertNodes(editor, [{type: 'break', children: [{text: ''}]}, {text: ''}], {select: true})
        break
      case 'moveUpOneRow':
        if (row > 1) {
          Transforms.moveNodes(editor, {
            at: rowPath,
            to: Path.previous(rowPath)
          })
        } else {
          Transforms.moveNodes(editor, {
            at: rowPath,
            to: [...tableRef.current[1], rows - 1]
          })
        }
        break
      case 'moveDownOneRow':
        if (row < rows - 1) {
          Transforms.moveNodes(editor, {
            at: rowPath,
            to: Path.next(rowPath)
          })
        } else {
          Transforms.moveNodes(editor, {
            at: rowPath,
            to: [...tableRef.current[1], 1]
          })
        }
        break
      case 'moveLeftOneCol':
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.moveNodes(editor, {
            at: [...tableRef.current![1], i, index],
            to: [...tableRef.current![1], i, index > 0 ? index - 1 : columns - 1]
          })
        })
        break
      case 'moveRightOneCol':
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.moveNodes(editor, {
            at: [...tableRef.current![1], i, index],
            to: [...tableRef.current![1], i, index === columns - 1 ? 0 : index + 1]
          })
        })
        break
      case 'removeCol':
        if (columns < 2) {
          remove()
          return
        }
        if (index < columns - 1) {
          Transforms.select(editor, Editor.start(editor, [...tableRef.current[1], row, index + 1]))
        } else {
          Transforms.select(editor, Editor.start(editor, [...tableRef.current[1], row, index - 1]))
        }
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.delete(editor, {
            at: [...tableRef.current![1], rows - i - 1, index]
          })
        })
        break
      case 'removeRow':
        if (rows < 2) {
          remove()
        } else {
          removeRow(Path.parent(path), index, columns)
        }
        break
    }
    ReactEditor.focus(editor)
  },[])
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (isHotkey('mod+shift+backspace', e)) {
        e.preventDefault()
        task('removeRow')
      }
      if (isHotkey('mod+alt+backspace', e)) {
        e.preventDefault()
        task('removeCol')
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      window.removeEventListener('keydown', keydown)
    }
  }, [])
  useSubject(store.tableTask$, task)
  return (
    <div
      style={{
        left: state().left,
        top: state().top,
        width: state().width
      }}
      onMouseDown={e => e.preventDefault()}
      className={`${state().visible ? '' : 'hidden'} dark:bg-black/90 bg-white/90 backdrop-blur border-t border-l border-r border-gray-200 dark:border-gray-100/20
        text-sm absolute z-10 items-center flex justify-between dark:text-gray-300 text-gray-500 h-[24px] w-full px-2 rounded-tr rounded-tl select-none
      `}
    >
      <div className={'flex items-center space-x-2 text-center'}>
        <Popover
          placement="bottomLeft"
          title={null}
          open={state().scaleOpen}
          onOpenChange={open => {
            setState({scaleOpen: open})
          }}
          content={(
            <div>
              <div
                className={'space-y-0.5'}
                onMouseEnter={() => setState({enterScale: true})}
                onMouseLeave={() => setState({enterScale: false})}
              >
                {Array.from(new Array(10)).map((_, i) =>
                  <div className={'flex space-x-0.5'} key={i}>
                    {Array.from(new Array(6)).map((_, j) =>
                      <div
                        onMouseEnter={e => {
                          setState({selectRows: i + 1, selectCols: j + 1})
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          resetGird(i + 1, j + 1)
                        }}
                        className={`cursor-pointer w-4 h-4 border-gray-500 border ${getScaleGirdClass(i + 1, j + 1)}`}
                        key={j}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className={'mt-4 border-t border-gray-500 pt-2 text-center'}>
                {state().enterScale ?
                  <span>{state().selectCols} x {state().selectRows}</span> :
                  <span>{state().cols} x {state().rows}</span>
                }
              </div>
            </div>
          )}
          trigger="click">
          <div className={'t-handle'}>
            <AppstoreAddOutlined/>
          </div>
        </Popover>
        <Tooltip placement={'top'} title={'align left'} mouseEnterDelay={.5}>
          <div
            onClick={(e) => setAligns('left')}
            className={`${state().align === 'left' ? 'bg-gray-300/30 dark:bg-gray-300/10' : ''} t-handle`}
          >
            <AlignLeftOutlined/>
          </div>
        </Tooltip>
        <Tooltip placement={'top'} title={'align center'} mouseEnterDelay={.5}>
          <div
            onClick={() => setAligns('center')}
            className={`${state().align === 'center' ? 'bg-gray-300/30 dark:bg-gray-300/10' : ''} t-handle`}
          >
            <AlignCenterOutlined/>
          </div>
        </Tooltip>
        <Tooltip placement={'top'} title={'align right'} mouseEnterDelay={.5}>
          <div
            onClick={() => setAligns('right')}
            className={`${state().align === 'right' ? 'bg-gray-300/30 dark:bg-gray-300/10' : ''} t-handle`}
          >
            <AlignRightOutlined/>
          </div>
        </Tooltip>
        <div
          onClick={(e) => {
            store.openTableMenus(e, isHead())
          }}
          className={`t-handle text-lg`}
        >
          <EllipsisOutlined/>
        </div>
      </div>
      <div className={'flex items-center'}>
        <DeleteOutlined
          className={'cursor-pointer t-handle'}
          onClick={remove}
        />
      </div>
    </div>
  )
})
