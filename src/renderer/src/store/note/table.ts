import { TableCellNode, TableRowNode } from '../../editor'
import { ReactEditor } from 'slate-react'
import React from 'react'
import { Editor, Element, Node, Path, Transforms } from 'slate'
import isHotkey from 'is-hotkey'
import { TabStore } from './tab'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { openMenus } from '@/ui/common/Menu'
import { StructStore } from '../struct'

const store = {
  moveLeft: 0,
  showMoveMark: false,
  startedMove: false
}
export class TableLogic extends StructStore<typeof store> {
  private keys = new Set(['arrow', 'enter', 'backspace'])
  get editor() {
    return this.tab.editor
  }
  private checkProcess() {
    const [node] = Editor.nodes(this.editor, {
      mode: 'lowest',
      match: (n) => Element.isElement(n) && n.type === 'table-cell'
    })
    if (node) null
    return node
  }
  constructor(private readonly tab: TabStore) {
    super(store)
    this.hoverMark = this.hoverMark.bind(this)
    this.leaveMark = this.leaveMark.bind(this)
    this.startMove = this.startMove.bind(this)
    window.addEventListener('keydown', (e) => {
      if (!ReactEditor.isFocused(this.editor)) {
        return
      }
      if (!this.keys.has(e.key?.toLowerCase())) {
        return
      }
      const node = this.checkProcess()
      if (!node) return
      if (isHotkey('mod+enter', e)) {
        Transforms.insertNodes(
          this.editor,
          [{ type: 'break', children: [{ text: '' }] }, { text: '' }],
          { select: true }
        )
        e.preventDefault()
      }
      if (isHotkey('mod+shift+enter', e)) {
        e.preventDefault()
        this.task('insertRowAfter')
      }
      if (isHotkey('enter', e)) {
        e.preventDefault()
        const index = node[1][node[1].length - 1]
        const nextRow = Path.next(Path.parent(node[1]))
        if (Editor.hasPath(this.editor, nextRow)) {
          Transforms.select(this.editor, Editor.end(this.editor, [...nextRow, index]))
        } else {
          const tableNext = Path.next(Path.parent(Path.parent(node[1])))
          if (Editor.hasPath(this.editor, tableNext)) {
            Transforms.select(this.editor, Editor.start(this.editor, tableNext))
          } else {
            Transforms.insertNodes(this.editor, EditorUtils.p, { at: tableNext, select: true })
          }
        }
      }
      if (isHotkey('mod+shift+backspace', e)) {
        if (!ReactEditor.isFocused(this.editor)) null
        e.preventDefault()
        this.task('removeRow')
      }
      if (isHotkey('mod+alt+enter', e)) {
        e.preventDefault()
        this.task('insertColAfter')
      }
      if (isHotkey('mod+alt+backspace', e)) {
        e.preventDefault()
        this.task('removeCol')
      }
    })
  }

  hoverMark(e: React.MouseEvent) {
    const div = e.target as HTMLDivElement
    this.setState({
      moveLeft: div.parentElement!.offsetLeft + div.parentElement!.clientWidth - 2,
      showMoveMark: true
    })
  }
  leaveMark() {
    this.setState({
      showMoveMark: false
    })
  }
  startMove(e: React.MouseEvent) {
    e.preventDefault()
    const div = e.target as HTMLDivElement
    const startLeft = e.clientX
    const cellLeft = div.parentElement!.offsetLeft
    const cellWidth = div.parentElement!.clientWidth
    const index = Array.from(div.parentElement!.parentElement!.children).indexOf(div.parentElement!)
    const node = ReactEditor.toSlateNode(this.editor, div.parentElement!)
    const cellPath = ReactEditor.findPath(this.editor, node)
    const tablePath = Path.parent(Path.parent(cellPath))
    const tableNode = Node.get(this.editor, tablePath)
    const minLeft = cellLeft + 50
    const startMoveLeft = cellLeft + div.parentElement!.clientWidth - 2
    this.setState({
      moveLeft: startMoveLeft,
      startedMove: true
    })
    document.body.classList.add('cursor-col-resize')
    let width = cellWidth
    const move = (e: MouseEvent) => {
      const offset = e.clientX - startLeft
      try {
        width = cellWidth + offset
        if (width < 50) {
          width = 50
        }
        if (width > 500) {
          width = 500
        }
        this.setState({
          moveLeft: startMoveLeft + offset
        })
        if (this.state.moveLeft < minLeft) {
          this.setState({
            moveLeft: cellLeft + 48
          })
        }
      } catch {}
    }
    window.addEventListener('mousemove', move)
    window.addEventListener(
      'mouseup',
      () => {
        for (let i = 0; i < tableNode.children.length; i++) {
          Transforms.setNodes(
            this.editor,
            {
              width
            },
            { at: [...tablePath, i, index] }
          )
        }
        window.removeEventListener('mousemove', move)
        document.body.classList.remove('cursor-col-resize')
        this.setState({
          startedMove: false,
          showMoveMark: false
        })
      },
      { once: true }
    )
  }
  align(type: 'left' | 'center' | 'right') {
    const cell = this.checkProcess()
    if (!cell) {
      return
    }
    const table = Editor.node(this.editor, Path.parent(Path.parent(cell[1])))
    const index = cell[1][cell[1].length - 1]
    table[0].children.forEach((el) => {
      el.children?.forEach((cell, i) => {
        if (i === index) {
          Transforms.setNodes(
            this.editor,
            { align: type },
            { at: EditorUtils.findPath(this.editor, cell) }
          )
        }
      })
    })
    ReactEditor.focus(this.editor)
  }
  openTableMenus(e: MouseEvent | React.MouseEvent, head?: boolean, cb?: () => void) {
    e.preventDefault()
    openMenus(
      e,
      [
        {
          text: 'Add Row Above',
          click: () => this.task('insertRowBefore')
        },
        {
          text: 'Add Row Below',
          key: 'cmd+shift+enter',
          click: () => this.task('insertRowAfter')
        },
        { hr: true },
        {
          text: 'Add Column Before',
          click: () => this.task('insertColBefore')
        },
        {
          text: 'Add Column After',
          key: 'cmd+option+enter',
          click: () => this.task('insertColAfter')
        },
        { hr: true },
        {
          text: 'Line break within table-cell',
          key: 'cmd+enter',
          click: () => this.task('insertTableCellBreak')
        },
        {
          text: 'Text Align',
          children: [
            {
              text: 'Align Left',
              click: () => this.align('left')
            },
            {
              text: 'Align Center',
              click: () => this.align('center')
            },
            {
              text: 'Align Right',
              click: () => this.align('right')
            }
          ]
        },
        {
          text: 'Move',
          children: [
            {
              text: 'Move Up One Row',
              disabled: head,
              click: () => this.task('moveUpOneRow')
            },
            {
              text: 'Move Down One Row',
              disabled: head,
              click: () => this.task('moveDownOneRow')
            },
            {
              text: 'Move Left One Column',
              click: () => this.task('moveLeftOneCol')
            },
            {
              text: 'Move Right One Column',
              click: () => this.task('moveRightOneCol')
            }
          ]
        },
        { hr: true },
        {
          text: 'Delete Column',
          key: 'cmd+option+backspace',
          click: () => this.task('removeCol')
        },
        {
          text: 'Delete Row',
          key: 'cmd+shift+backspace',
          click: () => this.task('removeRow')
        },
        { hr: true },
        { text: 'Delete Table', click: () => this.remove() }
      ],
      cb
    )
  }
  insertRow(path: Path, columns: number, preRow: TableCellNode[]) {
    Transforms.insertNodes(
      this.editor,
      {
        type: 'table-row',
        children: Array.from(new Array(columns)).map((_, i) => {
          return {
            type: 'table-cell',
            width: preRow[i]?.width,
            children: [{ text: '' }]
          } as TableCellNode
        })
      },
      {
        at: path
      }
    )
    Transforms.select(this.editor, Editor.start(this.editor, path))
  }
  insertCol(tablePath: Path, rows: number, index: number) {
    Array.from(new Array(rows)).map((_, i) => {
      Transforms.insertNodes(
        this.editor,
        {
          type: 'table-cell',
          children: [{ text: '' }],
          title: i === 0
        },
        {
          at: [...tablePath, i, index]
        }
      )
    })
    Transforms.select(this.editor, [...tablePath, 0, index, 0])
  }
  remove() {
    const [node] = Editor.nodes(this.editor, {
      match: (n) => n.type === 'table'
    })
    if (node) {
      Transforms.delete(this.editor, { at: node[1] })
      Transforms.insertNodes(
        this.editor,
        { type: 'paragraph', children: [{ text: '' }] },
        { at: node[1], select: true }
      )
    }
  }
  removeRow(rowPath: Path, index: number, columns: number, tablePath: Path) {
    if (Path.hasPrevious(rowPath)) {
      Transforms.select(
        this.editor,
        Editor.end(this.editor, [...tablePath, rowPath[rowPath.length - 1] - 1, index])
      )
    } else {
      Transforms.select(
        this.editor,
        Editor.end(this.editor, [...tablePath, rowPath[rowPath.length - 1], index])
      )
    }
    Transforms.delete(this.editor, { at: rowPath })
    if (rowPath[rowPath.length - 1] === 0) {
      Array.from(new Array(columns)).map((_, i) => {
        Transforms.setNodes(
          this.editor,
          {
            title: true
          },
          {
            at: [...rowPath, i]
          }
        )
      })
    }
  }
  task(task: string) {
    const node = this.checkProcess()
    if (!node) return
    const [table, tablePath] = Editor.node(this.editor, Path.parent(Path.parent(node[1])))
    const columns = table.children[0].children.length
    const rows = table.children.length
    const path = node[1]
    const index = path[path.length - 1]
    const rowPath = Path.parent(path)
    const row = path[path.length - 2]
    this.tab.doManual()
    switch (task) {
      case 'insertRowAfter':
        this.insertRow(Path.next(Path.parent(path)), columns, table.children[0].children)
        break
      case 'insertRowBefore':
        this.insertRow(
          row === 0 ? Path.next(Path.parent(path)) : Path.parent(path),
          columns,
          table.children[0].children
        )
        break
      case 'insertColBefore':
        // 带滚动
        this.insertCol(tablePath, rows, index)
        break
      case 'insertColAfter':
        // 带滚动
        this.insertCol(tablePath, rows, index + 1)
        break
      case 'insertTableCellBreak':
        Transforms.insertNodes(
          this.editor,
          [{ type: 'break', children: [{ text: '' }] }, { text: '' }],
          { select: true }
        )
        break
      case 'moveUpOneRow':
        if (row > 1) {
          Transforms.moveNodes(this.editor, {
            at: rowPath,
            to: Path.previous(rowPath)
          })
        } else {
          Transforms.moveNodes(this.editor, {
            at: rowPath,
            to: [...tablePath, rows - 1]
          })
        }
        break
      case 'moveDownOneRow':
        if (row < rows - 1) {
          Transforms.moveNodes(this.editor, {
            at: rowPath,
            to: Path.next(rowPath)
          })
        } else {
          Transforms.moveNodes(this.editor, {
            at: rowPath,
            to: [...tablePath, 1]
          })
        }
        break
      case 'moveLeftOneCol':
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.moveNodes(this.editor, {
            at: [...tablePath, i, index],
            to: [...tablePath, i, index > 0 ? index - 1 : columns - 1]
          })
        })
        break
      case 'moveRightOneCol':
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.moveNodes(this.editor, {
            at: [...tablePath, i, index],
            to: [...tablePath, i, index === columns - 1 ? 0 : index + 1]
          })
        })
        break
      case 'removeCol':
        if (columns < 2) {
          this.remove()
          return
        }
        if (index < columns - 1) {
          Transforms.select(this.editor, Editor.start(this.editor, [...tablePath, row, index + 1]))
        } else {
          Transforms.select(this.editor, Editor.start(this.editor, [...tablePath, row, index - 1]))
        }
        Array.from(new Array(rows)).map((_, i) => {
          Transforms.delete(this.editor, {
            at: [...tablePath, rows - i - 1, index]
          })
        })
        break
      case 'removeRow':
        if (rows < 2) {
          this.remove()
        } else {
          this.removeRow(Path.parent(path), index, columns, tablePath)
        }
        break
    }
    ReactEditor.focus(this.editor)
  }
}
