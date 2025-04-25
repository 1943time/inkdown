import { Editor, Element, Node, NodeEntry, Path, Point, Range, Transforms } from 'slate'
import { EditorUtils } from '../utils/editorUtils'
import { Elements, ListNode, TableRowNode } from '..'
import { ReactEditor } from 'slate-react'

const insertAfter = (
  editor: Editor,
  path: Path,
  node: Elements = {
    type: 'paragraph',
    children: [{ text: '' }]
  }
) => {
  const nextPath = Path.next(path)
  Transforms.insertNodes(editor, node, { select: true, at: nextPath })
}

export type CheckMdParams = {
  sel: Range
  editor: Editor
  path: Path
  match: RegExpMatchArray
  el: Element
  startText: string
}

interface MdNode {
  reg: RegExp
  config?: string
  matchKey?: string | RegExp
  checkAllow?: (ctx: { editor: Editor; node: NodeEntry<Element>; sel: Range }) => boolean
  run: (ctx: CheckMdParams) => void | boolean
}

const matchText = (insert: (ctx: CheckMdParams) => void, matchString?: string) => {
  return (ctx: CheckMdParams) => {
    const { sel, editor, match, startText } = ctx
    const leaf = Node.leaf(editor, sel.anchor.path)
    if (EditorUtils.isDirtLeaf(leaf)) return false
    if (matchString) {
      const preStr = Node.string(leaf) + matchString
      const prev = preStr[match.index! - 1]
      if (prev === matchString) return false
    }
    Transforms.select(editor, {
      anchor: { path: sel.anchor.path, offset: match.index! },
      focus: { path: sel.anchor.path, offset: match.index! + startText.length - 1 }
    })
    insert(ctx)
    const addSel = editor.selection
    if (addSel) EditorUtils.moveAfterSpace(editor, addSel.focus.path)
    return true
  }
}
const MdElements: Record<string, MdNode> = {
  table: {
    reg: /^\s*\|((?:[^|\n]+\|?)+)\|\s*$/,
    run: ({ editor, path, match }) => {
      const columns = match[1].split('|')
      Transforms.delete(editor, { at: path })
      Transforms.insertNodes(
        editor,
        {
          type: 'table',
          children: [
            {
              type: 'table-row',
              children: columns.map((c) => ({
                type: 'table-cell',
                title: true,
                children: [{ text: c }]
              }))
            },
            {
              type: 'table-row',
              children: columns.map((c) => ({ type: 'table-cell', children: [{ text: '' }] }))
            }
          ] as TableRowNode[]
        },
        { at: path }
      )
      Transforms.select(editor, [...path, 1, 0, 0])
    }
  },
  inlineKatex: {
    reg: /\$([^\n$]+)\$$/,
    matchKey: '$',
    checkAllow: (ctx) => {
      return ['paragraph', 'table-cell'].includes(ctx.node[0].type)
    },
    run: ({ editor, path, match, sel }) => {
      Transforms.select(editor, {
        anchor: { path: sel.anchor.path, offset: sel.anchor.offset - match[0].length + 1 },
        focus: { path: sel.anchor.path, offset: sel.anchor.offset }
      })
      Transforms.insertNodes(editor, {
        type: 'inline-katex',
        children: [{ text: match[1].trim() }]
      })
      EditorUtils.moveAfterSpace(editor, Path.next(sel.anchor.path))
      return true
    }
  },
  katex: {
    reg: /^\s*(\$\$|￥￥)\s*$/,
    run: ({ editor, path, match }) => {
      Transforms.delete(editor, { at: path })
      Transforms.insertNodes(
        editor,
        {
          type: 'code',
          language: 'latex',
          code: '',
          children: [{ text: '' }],
          katex: true
        },
        { at: path, select: true }
      )
    }
  },
  head: {
    matchKey: ' ',
    checkAllow: (ctx) => {
      return (
        EditorUtils.isTop(ctx.editor, ctx.node[1]) &&
        ['paragraph', 'head'].includes(ctx.node[0].type) &&
        !Path.hasPrevious(ctx.sel.anchor.path)
      )
    },
    reg: /^\s*(#{1,5})(\s+)([^\n]*)$/,
    run: ({ editor, path, match, sel, startText }) => {
      let text: any = [{ text: '' }]
      if (!Point.equals(sel.anchor, Editor.end(editor, path))) {
        text = EditorUtils.cutText(editor, sel.anchor)
      }
      Transforms.delete(editor, {
        at: path
      })
      Transforms.insertNodes(
        editor,
        {
          type: 'head',
          level: match[1].length,
          children: text
        },
        {
          at: path
        }
      )
      Transforms.select(editor, Editor.start(editor, path))
      return true
    }
  },
  link: {
    reg: /(?<!!)\[([^]+)]\(([^)]+)\)\s*/,
    matchKey: ')',
    run: ({ editor, match, sel, startText }) => {
      Transforms.select(editor, {
        anchor: { path: sel.anchor.path, offset: match.index! },
        focus: { path: sel.anchor.path, offset: match.index! + startText.length }
      })
      Transforms.insertNodes(editor, [{ text: match[1], url: match[2] }, { text: '' }])
      return true
    }
  },
  img: {
    reg: /!\[([^]*)]\(([^)]+)\)\s*/,
    matchKey: ')',
    run: ({ editor, match, sel, startText }) => {
      Transforms.select(editor, {
        anchor: { path: sel.anchor.path, offset: match.index! },
        focus: { path: sel.anchor.path, offset: match.index! + startText.length }
      })
      Transforms.insertNodes(editor, [
        { type: 'media', alt: match[1], url: match[2], children: [{ text: '' }] }
      ])
      return true
    }
  },
  task: {
    reg: /^\s*\[(x|\s)]\s+/,
    matchKey: ' ',
    checkAllow: (ctx) => {
      if (ctx.node[0].type === 'paragraph') {
        const list = Editor.parent(ctx.editor, ctx.node[1])[0].type === 'list-item'
        return !(list && !Path.hasPrevious(ctx.node[1]))
      }
      return false
    },
    run: (ctx) => {
      Transforms.delete(ctx.editor, {
        at: ctx.path
      })
      Transforms.insertNodes(
        ctx.editor,
        {
          type: 'list',
          task: true,
          children: [
            {
              type: 'list-item',
              checked: ctx.match[1] === 'x',
              children: [EditorUtils.p]
            }
          ]
        } as ListNode,
        { at: ctx.path }
      )
      Transforms.select(ctx.editor, Editor.start(ctx.editor, ctx.path).path)
      return true
    }
  },
  list: {
    matchKey: ' ',
    reg: /^\s*(\d+\.|-|\*|\+)\s+?/,
    checkAllow: (ctx) => {
      if (Editor.parent(ctx.editor, ctx.node[1])[0].type === 'list-item') {
        return Path.hasPrevious(ctx.node[1])
      }
      return ['paragraph'].includes(ctx.node[0].type) && !Path.hasPrevious(ctx.sel.anchor.path)
    },
    run: ({ editor, match, sel, path }) => {
      const removeLength = match[0].match(/\s*(\d+\.|-|\*|\+)\s+/)?.[0].length || 0
      let texts: any[] = [{ text: '' }]
      if (!Point.equals(sel.anchor, Editor.end(editor, path))) {
        texts = EditorUtils.cutText(editor, sel.anchor)
      }
      Transforms.delete(editor, {
        at: path
      })
      const start = match[1].match(/^\s*(\d+)\./)
      Transforms.insertNodes(
        editor,
        {
          type: 'list',
          order: !!start,
          start: start ? +start[1] : undefined,
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: texts }]
            }
          ]
        } as ListNode,
        { at: path }
      )
      Transforms.select(editor, {
        path: Editor.start(editor, path).path,
        offset: sel.anchor.offset - removeLength
      })
      return true
    }
  },
  hr: {
    reg: /^\s*\*\*\*|___|---\s*/,
    checkAllow: (ctx) => ctx.node[0].type === 'paragraph' && ctx.node[1][0] !== 0,
    run: ({ editor, path }) => {
      Transforms.delete(editor, { at: path })
      Transforms.insertNodes(editor, { type: 'hr', children: [{ text: '' }] }, { at: path })
      insertAfter(editor, path)
    }
  },
  blockquote: {
    matchKey: ' ',
    reg: /^\s*>\s+([^\n]+)?/,
    checkAllow: (ctx) => {
      return ctx.node[0].type === 'paragraph'
    },
    run: ({ sel, editor, path, match, el }) => {
      if (sel && Range.isCollapsed(sel)) {
        const text = EditorUtils.cutText(editor, { path: sel.anchor.path, offset: 1 })
        Transforms.delete(editor, {
          at: path
        })
        Transforms.insertNodes(
          editor,
          {
            type: 'blockquote',
            children: [{ type: 'paragraph', children: text }]
          },
          { at: path }
        )
        Transforms.select(editor, Editor.start(editor, path))
      }
      return true
    }
  },
  bold: {
    reg: /[*]{2}([^*][^\n]*)[*]{2}/,
    matchKey: '*',
    run: matchText(({ editor, match }) => {
      Transforms.insertNodes(editor, [{ text: match[1], bold: true }], { select: true })
    }, '*')
  },
  italic: {
    reg: /[*]([^\n*]+)[*]/,
    matchKey: '*',
    run: matchText(({ editor, match }) => {
      Transforms.insertNodes(editor, [{ text: match[1], italic: true }], { select: true })
    }, '*')
  },
  inlineCode: {
    reg: /`([^\n`]+)`/,
    matchKey: '`',
    run: matchText(({ editor, match }) => {
      Transforms.insertNodes(editor, [{ text: match[1], code: true }])
    })
  },
  boldAndItalic: {
    reg: /[*]{3}([^\n]+)[*]{3}/,
    matchKey: '*',
    run: matchText(({ editor, match }) => {
      Transforms.insertNodes(editor, [{ text: match[1], italic: true, bold: true }], {
        select: true
      })
    })
  },
  strikethrough: {
    reg: /~~([^\n]+)~~/,
    matchKey: '~',
    run: matchText(({ editor, match }) => {
      Transforms.insertNodes(editor, [{ text: match[1], strikethrough: true }], { select: true })
    })
  },
  wikiLink: {
    reg: /\[/,
    matchKey: '[',
    run: ({ editor, sel }) => {
      const str = Editor.string(editor, {
        anchor: {
          path: sel.anchor.path,
          offset: sel.anchor.offset - 1
        },
        focus: {
          path: sel.anchor.path,
          offset: sel.anchor.offset
        }
      })
      if (str === '[') {
        setTimeout(() => {
          try {
            Transforms.insertNodes(editor, [{ type: 'wiki-link', children: [{ text: '' }] }], {
              select: true,
              at: {
                anchor: { path: sel.anchor.path, offset: editor.selection!.anchor.offset - 2 },
                focus: { path: sel.anchor.path, offset: editor.selection!.anchor.offset }
              }
            })
          } catch (e) {
            console.log(e)
          }
        }, 16)
      }
    }
  }
}
export const BlockMathNodes = Object.entries(MdElements)
  .filter((c) => !c[1].matchKey)
  .map((c) => Object.assign(c[1], { type: c[0] }))
export const TextMatchNodes = Object.entries(MdElements)
  .filter((c) => !!c[1].matchKey)
  .map((c) => Object.assign(c[1], { type: c[0] }))
