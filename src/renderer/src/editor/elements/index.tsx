import { RenderElementProps, RenderLeafProps } from 'slate-react/dist/components/editable'
import { Table, TableCell } from './table'
import { Blockquote } from './blockquote'
import { List, ListItem } from './list'
import { Head } from './head'
import React, { CSSProperties, useContext, useMemo } from 'react'
import { Paragraph } from './paragraph'
import { InlineChromiumBugfix } from '../utils/InlineChromiumBugfix'
import { Media } from './media'
import { Editor, Transforms } from 'slate'
import { ReactEditor } from 'slate-react'
import { EditorUtils } from '../utils/editorUtils'
import { slugify } from '../utils/dom'
import { useEditorStore } from '../../store/editor'
import InlineKatex from './CodeUI/Katex/InlineKatex'
import { useCoreContext } from '../../utils/env'
import { CoreStore } from '../../store/core'
import { Attachment } from './attachment'
import { runInAction } from 'mobx'
import { Icon } from '@iconify/react'
import { CustomLeaf } from '../../types/el'
import { IFileItem } from '../../types'
import { AceElement } from './ace'

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
const toHash = (core: CoreStore, hash: string = '') => {
  const dom = core.tree.currentTab.store.container?.querySelector(
    `[data-head="${slugify(hash.toLowerCase())}"]`
  ) as HTMLElement
  if (dom) {
    core.tree.currentTab.store.container?.scroll({
      top: dom.offsetTop + 100,
      behavior: 'smooth'
    })
  }
}
export const MElement = (props: RenderElementProps) => {
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
    case 'attach':
      return <Attachment {...props} />
    case 'code':
      return <AceElement {...props}/>
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
}

const findFirstChildNote = (node: IFileItem) => {
  if (!node.folder) {
    return node
  }
  const stack = node.children?.slice() || []
  let note: IFileItem | undefined = undefined
  while (stack.length) {
    const item = stack.shift()!
    if (!item.folder) {
      note = item
      break
    } else if (item.children?.length) {
      stack.unshift(...item.children)
    }
  }
  return note
}

export const MLeaf = (props: RenderLeafProps) => {
  const core = useCoreContext()
  const store = useEditorStore()
  return useMemo(() => {
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
          const path = ReactEditor.findPath(store.editor, props.text)
          if (path) {
            Transforms.select(store.editor, {
              anchor: Editor.start(store.editor, path),
              focus: Editor.end(store.editor, path)
            })
          }
        }
      } catch (e) {}
    }
    if (leaf.url || leaf.hash || leaf.docId || leaf.link) {
      return (
        <span
          style={style}
          data-be={'link'}
          draggable={false}
          title={'mod + click to open link, mod + alt + click to open file in new tab'}
          onDragStart={dragStart}
          data-url={leaf.url}
          onMouseDown={e => {
            if (!store.focus) {
              store.editor.selection = null
            }
          }}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (core.tree.selectItem) {
              runInAction(() => {
                core.tree.selectItem = null
              })
            }
            if (e.metaKey || e.ctrlKey) {
              if (leaf.docId) {
                let node = core.tree.nodeMap.get(leaf.docId)
                let folder = false
                if (node?.folder) {
                  node = findFirstChildNote(node)
                  folder = true
                  if (!node) {
                    core.message.info('The folder is empty')
                  }
                }
                if (node) {
                  e.altKey ? core.tree.appendTab(node) : core.tree.openNote(node)
                  if (leaf.hash) {
                    setTimeout(() => {
                      toHash(core, leaf.hash)
                    }, 200)
                  }
                } else if (!folder) {
                  core.message.info('The target doc has been deleted')
                }
              } else if (leaf.hash) {
                toHash(core, leaf.hash)
              } else if (leaf.url) {
                window.open(leaf.url)
              } else if (leaf.link) {
                window.open(leaf.link)
              } else {
                core.message.info('Invalid link')
              }
            } else if (e.detail === 2) {
              selectFormat()
            }
          }}
          data-slate-inline={true}
          className={`mx-[1px] inline-block link relative cursor-text ${className} ${!!leaf.docId || !!leaf.hash ? 'inner' : ''}`}
          {...props.attributes}
        >
          {!!props.text?.text && <InlineChromiumBugfix />}
          {children}
          {!!props.text?.text && <InlineChromiumBugfix />}
          {(!!leaf.docId || !!leaf.hash) &&
            core.config.config.showLinkIcon === 'true' &&
            !isDirtUrl(leaf) && (
              <Icon
                icon={'tabler:file-symlink'}
                className={'text-link-icon inner select-none'}
                tabIndex={-1}
              />
            )}
          {!leaf.docId &&
            !leaf.hash &&
            !isDirtUrl(leaf) &&
            core.config.config.showLinkIcon === 'true' && (
              <Icon
                icon={'eva:external-link-fill'}
                tabIndex={-1}
                className={'text-link-icon external select-none'}
              />
            )}
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
  }, [props.leaf, props.leaf.text])
}
