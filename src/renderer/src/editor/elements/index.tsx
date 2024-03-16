import {RenderElementProps, RenderLeafProps} from 'slate-react/dist/components/editable'
import {Table, TableCell} from './table'
import {CodeCtx, CodeElement, CodeLine} from './code'
import {Blockquote} from './blockquote'
import {List, ListItem} from './list'
import {Head} from './head'
import React, {CSSProperties, useContext, useMemo} from 'react'
import {Paragraph} from './paragraph'
import {InlineChromiumBugfix} from '../utils/InlineChromiumBugfix'
import {Media} from './media'
import {useEditorStore} from '../store'
import {Editor, Point, Transforms} from 'slate'
import {treeStore} from '../../store/tree'
import {InlineKatex} from './CodeUI/Katex/InlineKatex'
import {parsePath} from '../../utils'
import {ReactEditor} from 'slate-react'
import {EditorUtils} from '../utils/editorUtils'
import {isAbsolute, join} from 'path'
import {db} from '../../store/db'
import {slugify} from '../utils/dom'

const dragStart = (e: React.DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

const toHash = (hash: string) => {
  const dom = treeStore.currentTab.store.container?.querySelector(`[data-head="${slugify(hash.toLowerCase())}"]`) as HTMLElement
  if (dom) {
    treeStore.currentTab.store.container?.scroll({
      top: dom.offsetTop - 10,
      behavior: 'smooth'
    })
  }
}
export const MElement = (props: RenderElementProps) => {
  switch (props.element.type) {
    case 'blockquote':
      return (
        <Blockquote {...props}/>
      )
    case 'head':
      return <Head {...props}/>
    case 'hr':
      return <div {...props.attributes} contentEditable={false} className={'m-hr select-none'}>{props.children}</div>
    case 'break':
      return <span {...props.attributes} contentEditable={false}>{props.children}<br/></span>
    case 'list-item':
      return (
        <ListItem {...props}/>
      )
    case 'list':
      return (
        <List {...props}/>
      )
    case 'code':
      return (
        <CodeElement {...props}>{props.children}</CodeElement>
      )
    case 'code-line':
      return (
        <CodeLine {...props}/>
      )
    case 'table':
      return <Table {...props}>{props.children}</Table>
    case 'table-row':
      return <tr {...props.attributes}>{props.children}</tr>
    case 'table-cell':
      return <TableCell {...props}>{props.children}</TableCell>
    case 'media':
      return <Media {...props}/>
    case 'inline-katex':
      return <InlineKatex {...props}/>
    default:
      return <Paragraph {...props}/>
  }
}

export const MLeaf = (props: RenderLeafProps) => {
  const code = useContext(CodeCtx)
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
    if (leaf.highlight) className = 'high-text'
    if (leaf.html) className += ' dark:text-gray-500 text-gray-400'
    if (leaf.current) {
      style.background = '#f59e0b'
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
    if (leaf.url) {
      return (
        <span
          style={style}
          data-be={'link'}
          draggable={false}
          title={'mod + click to open link, mod + alt + click to open file in new tab'}
          onDragStart={dragStart}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (e.metaKey || e.ctrlKey) {
              const sel = store.editor.selection
              if (!sel || !Point.equals(sel.focus, sel.anchor) || !leaf.url) return
              if (/^https?/.test(leaf.url)) {
                window.open(leaf.url)
              } else {
                const parseRes = parsePath(leaf.url)
                if (!parseRes.path && parseRes.hash) {
                  return toHash(parseRes.hash)
                }
                const path = isAbsolute(parseRes.path) ? parseRes.path : join(treeStore.currentTab.current!.filePath, '..', parseRes.path)
                db.file.where('filePath').equals(path).toArray().then(res => {
                  for (let f of res) {
                    const node = treeStore.nodeMap.get(f.cid)
                    if (node) {
                      e.altKey ? treeStore.appendTab(node) : treeStore.openNote(node)
                      if (parseRes.hash) {
                        setTimeout(() => {
                          toHash(parseRes.hash)
                        }, 200)
                      }
                      break
                    }
                  }
                })
              }
            } else if (e.detail === 2) {
              selectFormat()
            }
          }}
          data-slate-inline={true}
          className={`mx-[1px] link cursor-default ${className}`}
          {...props.attributes}>
          {!!props.text?.text &&
            <InlineChromiumBugfix/>
          }
          {children}
          {!!props.text?.text &&
            <InlineChromiumBugfix/>
          }
        </span>
      )
    }
    return (
      <span
        {...props.attributes}
        data-be={'text'}
        draggable={false}
        onDragStart={dragStart}
        onClick={e => {
          if (e.detail === 2) {
            selectFormat()
          }
        }}
        data-fnc={leaf.fnc ? 'fnc' : undefined}
        data-fnd={leaf.fnd ? 'fnd' : undefined}
        data-fnc-name={leaf.fnc ? leaf.text?.replace(/\[\^(.+)]:?/g, '$1') : undefined}
        data-fnd-name={leaf.fnd ? leaf.text?.replace(/\[\^(.+)]:?/g, '$1') : undefined}
        className={`${!!dirty ? 'mx-[1px]' : ''} ${className}`}
        style={style}>
        {!!dirty && !!leaf.text &&
          <InlineChromiumBugfix/>
        }
        {children}
        {!!dirty && !!leaf.text &&
          <InlineChromiumBugfix/>
        }
      </span>
    )
  }, [
    props.leaf, props.leaf.text, code.lang
  ])
}
