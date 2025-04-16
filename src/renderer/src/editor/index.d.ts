import { BaseEditor, BaseElement, Element } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'
import { RenderElementProps } from 'slate-react/dist/components/editable'
import { Ace } from 'ace-builds'

type Align = 'left' | 'center' | 'right'
export type CodeNode = {
  type: 'code'
  children: { text: '' }[]
  language?: string
  katex?: boolean
  render?: boolean
  frontmatter?: boolean
  h?: number
  code: string
}
export type CodeLineNode = { type: 'code-line'; children: BaseElement['children']; num?: number }
export type ParagraphNode = { type: 'paragraph'; children: BaseElement['children']; h?: number }
export type TableNode = { type: 'table'; children: TableRowNode[] }
export type TableRowNode = { type: 'table-row'; children: TableCellNode[] }
export type TableCellNode = {
  type: 'table-cell'
  title?: boolean
  align?: Align
  children: BaseElement['children']
  width?: number
}
export type BlockQuoteNode = { type: 'blockquote'; children: (BlockQuoteNode | ParagraphNode)[] }
export type ListNode = {
  type: 'list'
  children: ListItemNode[]
  order?: boolean
  start?: number
  task?: boolean
  h?: number
}
export type ListItemNode = {
  type: 'list-item'
  children: BaseElement['children']
  checked?: boolean
}
export type HeadNode = {
  type: 'head'
  children: BaseElement['children']
  level: number
  h?: number
}
export type HrNode = { type: 'hr' }
export type BreakNode = { type: 'break' }
export type MediaNode = {
  type: 'media'
  url?: string
  alt: string
  downloadUrl?: string
  id?: string
  height?: number
  mediaType?: string
  align?: 'left' | 'right'
  size?: number
}
export type InlineKatexNode = {
  type: 'inline-katex'
  value: string
  children: BaseElement['children']
}
export type AttachNode = {
  type: 'attach'
  id?: string
  name: string
  size: number
  height?: number
  preview?: boolean
  url?: string
}

export type RemoteNode = {
  type: 'remote'
  url: string
  height: number
}

export type Elements =
  | CodeNode
  | CodeLineNode
  | ParagraphNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | BlockQuoteNode
  | ListNode
  | ListItemNode
  | HeadNode
  | HrNode
  | MediaNode
  | InlineKatexNode
  | BreakNode
  | AttachNode

export type CustomLeaf = {
  bold?: boolean | null
  code?: boolean | null
  italic?: boolean | null
  strikethrough?: boolean | null
  color?: string
  highColor?: string
  url?: string
  text?: string
  docId?: string
  hash?: string
  highlight?: boolean | null
  current?: boolean | null
  html?: string
  // 自动识别的链接
  link?: stirng
  // footnote
  fnc?: boolean
  fnd?: boolean
}
export type NodeTypes<T = Elements> = T['type']

export type MapValue<T> =
  T extends Map<any, infer I> ? I : T extends WeakMap<any, infer I> ? I : unknown

declare module 'slate' {
  interface BaseText extends CustomLeaf {}
  interface BaseElement {
    align?: Align
  }
  interface BaseRange {
    color?: string
    highlight?: boolean
    current?: boolean
  }

  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor
    Element: Elements & BaseElement
    // Element: CustomElement
    Text: CustomLeaf
  }
}

export interface ElementProps<T = Element> extends RenderElementProps {
  element: T
}
