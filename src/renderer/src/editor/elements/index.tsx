import { RenderElementProps, RenderLeafProps } from 'slate-react/dist/components/editable'
import { Table, TableCell } from './table'
import { Blockquote } from './blockquote'
import { List, ListItem } from './list'
import { Head } from './head'
import React, { CSSProperties, memo } from 'react'
import { Paragraph } from './paragraph'
import { InlineChromiumBugfix } from '../utils/InlineChromiumBugfix'
import { Media } from './media'
import { Editor, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { EditorUtils } from '../utils/editorUtils'
import { slugify } from '../utils/dom'
import InlineKatex from './CodeUI/Katex/InlineKatex'
import { CustomLeaf } from '..'
import { AceElement } from './ace'
import { useTab } from '@/store/note/TabCtx'
import { TabStore } from '@/store/note/tab'

const dragStart = (e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}
const isDirtUrl = (text: CustomLeaf) => {
  return (
    !!text.bold ||
    !!text.code ||
    !!text.color ||
    !!text.fnc ||
    text.fnd ||
    text.html ||
    text.italic ||
    text.code ||
    text.strikethrough ||
    text.highColor ||
    !text.text
  )
}
const toHash = (tab: TabStore, hash: string = '') => {
  const dom = tab.container?.querySelector(
    `[data-head="${slugify(hash.toLowerCase())}"]`
  ) as HTMLElement
  if (dom) {
    tab.container?.scroll({
      top: dom.offsetTop + 100,
      behavior: 'smooth'
    })
  }
}
export const MElement = memo((props: RenderElementProps) => {
  const tab = useTab()
  // const refreshHighlight = tab.useState((state) => state.refreshHighlight)
  switch (props.element.type) {
    case 'blockquote':
      return <Blockquote {...props} />
    case 'head':
      return <Head {...props} />
    case 'hr':
      return (
        <div {...props.attributes} contentEditable={false} className={'m-hr select-none'}>
          {props.children}
        </div>
      )
    case 'break':
      return (
        <span {...props.attributes} contentEditable={false}>
          {props.children}
          <br />
        </span>
      )
    case 'list-item':
      return <ListItem {...props} />
    case 'list':
      return <List {...props} />
    case 'code':
      return <AceElement {...props} />
    case 'table':
      return <Table {...props}>{props.children}</Table>
    case 'table-row':
      return <tr {...props.attributes}>{props.children}</tr>
    case 'table-cell':
      return <TableCell {...props}>{props.children}</TableCell>
    case 'media':
      return <Media {...props} />
    case 'inline-katex':
      return <InlineKatex {...props} />
    default:
      return <Paragraph {...props} />
  }
})

export const MLeaf = memo((props: RenderLeafProps) => {
  const tab = useTab()
  const leaf = props.leaf
  const style: CSSProperties = {}
  let className = ''
  let children = <>{props.children}</>
  if (leaf.code) children = <code className={'inline-code'}>{children}</code>
  if (leaf.highColor) style.color = leaf.highColor
  if (leaf.color) style.color = leaf.color
  if (leaf.bold) children = <strong>{children}</strong>
  if (leaf.strikethrough) children = <s>{children}</s>
  if (leaf.italic) children = <i>{children}</i>
  if (leaf.highlight) className = 'match-text'
  if (leaf.html) className += ' dark:text-gray-500 text-gray-400'
  if (leaf.current) {
    className = 'match-current'
  }
  const dirty = leaf.bold || leaf.code || leaf.italic || leaf.strikethrough || leaf.highColor
  const selectFormat = () => {
    try {
      if (EditorUtils.isDirtLeaf(props.leaf)) {
        const path = ReactEditor.findPath(tab.editor, props.text)
        if (path) {
          Transforms.select(tab.editor, {
            anchor: Editor.start(tab.editor, path),
            focus: Editor.end(tab.editor, path)
          })
        }
      }
    } catch (e) {}
  }
  if (leaf.url || leaf.hash || leaf.link) {
    return (
      <span
        style={style}
        data-be={'link'}
        draggable={false}
        title={'mod + click to open link, mod + alt + click to open file in new tab'}
        onDragStart={dragStart}
        data-url={leaf.url}
        onMouseDown={(e) => {
          if (!focus) {
            tab.editor.selection = null
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          // if (selectedDocId) {
          //   tab.note.useState.setState((state) => {
          //     state.selectedDocId = null
          //   })
          // }
          if (e.metaKey || e.ctrlKey) {
            if (leaf.url) {
              window.open(leaf.url)
            }
            // if (leaf.docId) {
            //   let node:IDoc | undefined = nodes[leaf.docId]
            //   let folder = false
            //   if (node?.folder) {
            //     node = tab.note.findFirstChildNote(node)
            //     folder = true
            //     if (!node) {
            //       tab..info('The folder is empty')
            //     }
            //   }
            //   if (node) {
            //     e.altKey ? core.tree.appendTab(node) : core.tree.openNote(node)
            //     if (leaf.hash) {
            //       setTimeout(() => {
            //         toHash(core, leaf.hash)
            //       }, 200)
            //     }
            //   } else if (!folder) {
            //     core.message.info('The target doc has been deleted')
            //   }
            // } else if (leaf.hash) {
            //   toHash(core, leaf.hash)
            // } else if (leaf.url) {
            //   window.open(leaf.url)
            // } else if (leaf.link) {
            // window.open(leaf.link)
            // } else {
            //   core.message.info('Invalid link')
            // }
          } else if (e.detail === 2) {
            selectFormat()
          }
        }}
        data-slate-inline={true}
        className={`mx-[1px] inline-block link relative cursor-default ${className} ${!!leaf.hash ? 'inner' : ''}`}
        {...props.attributes}
      >
        {!!props.text?.text && <InlineChromiumBugfix />}
        {children}
        {!!props.text?.text && <InlineChromiumBugfix />}
      </span>
    )
  }
  return (
    <span
      {...props.attributes}
      data-be={'text'}
      draggable={false}
      onDragStart={dragStart}
      onClick={(e) => {
        if (e.detail === 2) {
          selectFormat()
        }
      }}
      data-fnc={leaf.fnc ? 'fnc' : undefined}
      data-fnd={leaf.fnd ? 'fnd' : undefined}
      data-fnc-name={leaf.fnc ? leaf.text?.replace(/\[\^(.+)]:?/g, '$1') : undefined}
      data-fnd-name={leaf.fnd ? leaf.text?.replace(/\[\^(.+)]:?/g, '$1') : undefined}
      className={`${!!dirty ? 'mx-[1px]' : ''} ${className}`}
      style={style}
    >
      {!!dirty && !!leaf.text && <InlineChromiumBugfix />}
      {children}
      {!!dirty && !!leaf.text && <InlineChromiumBugfix />}
    </span>
  )
})
