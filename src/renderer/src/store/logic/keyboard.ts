import { runInAction } from 'mobx'
import { Editor, Element, Node, Path, Range, Transforms } from 'slate'
import { statSync } from 'fs'
import { selChange$ } from '@renderer/editor/plugins/useOnchange'
import { Core } from '../core'
import { parserMdToSchema } from '../../editor/parser/parser'
import { db } from '../db'
import { nid } from '../../utils'
import { EditorUtils } from '../../editor/utils/editorUtils'
import { MainApi } from '../../api/main'
import { quickOpen$ } from '../../components/QuickOpen'
import { IFileItem, ISpaceNode } from '../../types'

export class KeyboardTask {
  constructor(private readonly core: Core) {}
  get store() {
    return this.core.tree.currentTab.store
  }
  get editor() {
    return this.store.editor
  }
  get tree() {
    return this.core.tree
  }
  get curNodes() {
    return Editor.nodes<any>(this.editor, { mode: 'lowest', match: (m) => Element.isElement(m) })
  }

  private openFloatBar() {
    setTimeout(() => {
      try {
        const domRange = window.getSelection()?.getRangeAt(0)
        const rect = domRange?.getBoundingClientRect()
        if (rect) {
          this.store.setState((state) => (state.domRect = rect))
        }
      } catch (e) {}
    })
  }

  private async openSingleMd(path: string) {
    const file = await db.file.where('filePath').equals(path).first()
    const stat = statSync(path)
    if (file && !file.spaceId) {
      if (stat.mtime.valueOf() === file.updated) {
        this.core.tree.openNote(this.core.node.createFileNode(file))
      } else {
        const [res] = await parserMdToSchema([{ filePath: path }])
        db.file.update(file.cid, {
          schema: res.schema,
          updated: stat.mtime.valueOf()
        })
        file.schema = res.schema
        file.updated = stat.mtime.valueOf()
        this.tree.openNote(this.core.node.createFileNode(file))
      }
    } else {
      const [res] = await parserMdToSchema([{ filePath: path }])
      const now = Date.now()
      const id = nid()
      await db.file.add({
        cid: id,
        created: now,
        updated: stat.mtime.valueOf(),
        folder: false,
        schema: res.schema,
        sort: 0,
        filePath: path
      })
      const file = await db.file.get(id)
      if (file) this.tree.openNote(this.core.node.createFileNode(file))
    }
  }

  selectAll() {
    const [node] = this.curNodes
    if (node[0]?.type === 'table-cell') {
      Transforms.select(this.editor, Path.parent(Path.parent(node[1])))
    } else if (node[0]?.type === 'code-line') {
      Transforms.select(this.editor, Path.parent(node[1]))
    } else {
      Transforms.select(this.editor, {
        anchor: Editor.start(this.editor, []),
        focus: Editor.end(this.editor, [])
      })
    }
  }

  selectLine() {
    if (this.editor.selection) {
      const [node] = Editor.nodes<any>(this.editor, {
        mode: 'lowest',
        match: (m) => Element.isElement(m)
      })
      Transforms.select(this.editor, Path.parent(this.editor.selection.anchor.path))
      const text = Node.leaf(this.editor, this.editor.selection.anchor.path).text || ''
      if (text && node?.[0].type !== 'code-line') {
        this.openFloatBar()
      }
    }
  }

  lineBreakWithinParagraph() {
    if (this.editor.selection) {
      const [node] = Editor.nodes<any>(this.editor, {
        mode: 'lowest',
        match: (m) => Element.isElement(m)
      })
      if (node[0].type === 'paragraph' && Node.parent(this.editor, node[1])?.type !== 'list-item') {
        Transforms.insertText(this.editor, '\n')
      }
    }
  }
  selectFormat() {
    if (this.editor.selection) {
      const [node] = Editor.nodes<any>(this.editor, {
        mode: 'lowest',
        match: (m) => Element.isElement(m)
      })
      Transforms.select(this.editor, this.editor.selection.anchor.path)
      if (node?.[0].type !== 'code-line' && !Range.isCollapsed(this.editor.selection)) {
        this.openFloatBar()
      }
    }
  }

  selectWord() {
    const sel = this.editor.selection
    if (sel && Range.isCollapsed(sel)) {
      const text = Node.leaf(this.editor, sel.anchor.path).text || ''
      let start = sel.anchor.offset
      let end = start
      const next = text.slice(start)
      const pre = text.slice(0, start)
      let m1 = next.match(/^(\w+)/)
      if (m1) {
        end += m1[1].length
        let m2 = pre.match(/(\w+)$/)
        if (m2) start = start - m2[1].length
      } else {
        m1 = next.match(/^([\u4e00-\u9fa5]+)/)
        if (m1) {
          end += m1[1].length
          let m2 = pre.match(/([\u4e00-\u9fa5]+)$/)
          if (m2) start = start - m2[1].length
        } else {
          let m2 = pre.match(/(\w+)$/)
          if (!m2) m2 = pre.match(/([\u4e00-\u9fa5]+)$/)
          if (m2) start -= m2[1].length
        }
      }
      if (start === sel.anchor.offset && end === sel.anchor.offset && next) {
        end = start + 1
      }
      Transforms.select(this.editor, {
        anchor: { path: sel.anchor.path, offset: start },
        focus: { path: sel.anchor.path, offset: end }
      })
      const [node] = this.curNodes
      if (node?.[0].type !== 'code-line' && !Range.isCollapsed(this.editor.selection!))
        this.openFloatBar()
    }
  }

  async pastePlainText() {
    const text = window.api.getClipboardText()
    if (text) {
      const [node] = this.curNodes
      if (node[0].type === 'code-line') {
        Transforms.insertFragment(
          this.editor,
          text.split(/\r?\n/).map((c) => {
            return { type: 'code-line', children: [{ text: c }] }
          })
        )
        setTimeout(() => {
          runInAction(() => {
            this.store.refreshHighlight = !this.store.refreshHighlight
          })
        }, 60)
      } else if (node[0].type === 'table-cell') {
        Editor.insertText(this.editor, text.replace(/\n/g, ' '))
      } else {
        Editor.insertText(this.editor, text)
      }
    }
  }
  async insertMarkdown(md: string) {
    const [node] = this.curNodes
    const [res] = await parserMdToSchema([{ code: md, filePath: '' }])
    if (this.core.config.state.autoDownload) {
      const stack = res.schema.slice()
      while (stack.length) {
        const item = stack.pop()! as Element
        if (item.type === 'media' && item.url?.startsWith('http')) {
          item.downloadUrl = item.url
        }
        if (item.children?.length) {
          stack.push(...item.children)
        }
      }
    }
    if (node[0].type === 'paragraph' && !Node.string(node[0]) && node[0].children.length === 1) {
      Transforms.delete(this.editor, { at: node[1] })
      Transforms.insertNodes(this.editor, res.schema, { at: node[1], select: true })
      return
    }
    if (res.schema[0]?.type === 'paragraph' && ['paragraph', 'table-cell'].includes(node[0].type)) {
      const first = res.schema.shift()
      Editor.insertNode(this.editor, first.children)
    }
    if (res.schema.length) {
      if (['code-line', 'table-cell', 'inline-katex'].includes(node[0].type)) {
        const [block] = Editor.nodes<any>(this.editor, {
          match: (n) => ['table', 'code', 'paragraph'].includes(n.type),
          mode: 'lowest'
        })
        Transforms.insertNodes(this.editor, res.schema, {
          at: Path.next(block[1]),
          select: true
        })
      } else {
        Transforms.insertNodes(this.editor, res.schema, {
          at: Path.next(node[1]),
          select: true
        })
      }
    }
    setTimeout(() => {
      runInAction(() => (this.store!.refreshHighlight = !this.store!.refreshHighlight))
    }, 100)
  }
  async pasteMarkdownCode() {
    const markdownCode = window.api.getClipboardText()
    if (markdownCode) {
      this.insertMarkdown(markdownCode)
    }
  }

  head(level: number) {
    const [node] = this.curNodes
    if (
      node &&
      ['paragraph', 'head'].includes(node[0].type) &&
      EditorUtils.isTop(this.editor, node[1])
    ) {
      Transforms.setNodes(this.editor, { type: 'head', level }, { at: node[1] })
    }
  }

  paragraph() {
    const [node] = this.curNodes
    if (node && ['head'].includes(node[0].type)) {
      Transforms.setNodes(this.editor, { type: 'paragraph' }, { at: node[1] })
    }
  }

  increaseHead() {
    const [node] = this.curNodes
    if (
      node &&
      ['paragraph', 'head'].includes(node[0].type) &&
      EditorUtils.isTop(this.editor, node[1])
    ) {
      if (node[0].type === 'paragraph') {
        Transforms.setNodes(this.editor, { type: 'head', level: 4 }, { at: node[1] })
      } else if (node[0].level === 1) {
        Transforms.setNodes(this.editor, { type: 'paragraph' }, { at: node[1] })
      } else {
        Transforms.setNodes(this.editor, { level: node[0].level - 1 }, { at: node[1] })
      }
    }
  }

  decreaseHead() {
    const [node] = this.curNodes
    if (
      node &&
      ['paragraph', 'head'].includes(node[0].type) &&
      EditorUtils.isTop(this.editor, node[1])
    ) {
      if (node[0].type === 'paragraph') {
        Transforms.setNodes(this.editor, { type: 'head', level: 1 }, { at: node[1] })
      } else if (node[0].level === 4) {
        Transforms.setNodes(this.editor, { type: 'paragraph' }, { at: node[1] })
      } else {
        Transforms.setNodes(this.editor, { level: node[0].level + 1 }, { at: node[1] })
      }
    }
  }

  insertQuote() {
    const [node] = this.curNodes
    if (!['paragraph', 'head'].includes(node[0].type)) return
    if (Node.parent(this.editor, node[1]).type === 'blockquote') {
      Transforms.unwrapNodes(this.editor, { at: Path.parent(node[1]) })
      return
    }
    if (node[0].type === 'head') {
      Transforms.setNodes(
        this.editor,
        {
          type: 'paragraph'
        },
        { at: node[1] }
      )
    }
    Transforms.wrapNodes(this.editor, {
      type: 'blockquote',
      children: []
    })
  }

  insertTable() {
    const [node] = this.curNodes
    if (node && ['paragraph', 'head'].includes(node[0].type)) {
      const path =
        node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
      Transforms.insertNodes(
        this.editor,
        {
          type: 'table',
          children: [
            {
              type: 'table-row',
              children: [
                { type: 'table-cell', title: true, children: [{ text: '' }] },
                {
                  type: 'table-cell',
                  title: true,
                  children: [{ text: '' }]
                },
                { type: 'table-cell', title: true, children: [{ text: '' }] }
              ]
            },
            {
              type: 'table-row',
              children: [
                { type: 'table-cell', children: [{ text: '' }] },
                {
                  type: 'table-cell',
                  children: [{ text: '' }]
                },
                { type: 'table-cell', children: [{ text: '' }] }
              ]
            },
            {
              type: 'table-row',
              children: [
                { type: 'table-cell', children: [{ text: '' }] },
                {
                  type: 'table-cell',
                  children: [{ text: '' }]
                },
                { type: 'table-cell', children: [{ text: '' }] }
              ]
            }
          ]
        },
        { at: path }
      )
      if (node[0].type === 'paragraph' && !Node.string(node[0])) {
        Transforms.delete(this.editor, { at: Path.next(path) })
      }
      Transforms.select(this.editor, Editor.start(this.editor, path))
    }
  }

  insertCode(type?: 'katex' | 'mermaid' | 'html') {
    const [node] = this.curNodes
    if (node && ['paragraph', 'head'].includes(node[0].type)) {
      const path =
        node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
      let lang = ''
      let code = ''
      if (type === 'mermaid') {
        lang = 'mermaid'
        code = 'flowchart TD\n    Start --> Stop'
      }
      if (type === 'katex') {
        lang = 'tex'
        code = 'c = \\pm\\sqrt{a^2 + b^2}'
      }
      if (type === 'html') {
        lang = 'html'
        code = '<div style="text-align:center">text</div>'
      }
      Transforms.insertNodes(
        this.editor,
        {
          type: 'code',
          code,
          language: lang ? lang : undefined,
          children: [{text: ''}],
          render: type === 'html' ? true : undefined,
          katex: type === 'katex'
        },
        { at: path }
      )

      Transforms.select(this.editor, Editor.end(this.editor, path))
    }
  }

  inlineKatex() {
    const sel = this.store.editor.selection
    if (sel) {
      Transforms.insertNodes(
        this.editor,
        {
          type: 'inline-katex',
          children: [{ text: '' }]
        },
        { select: true }
      )
    }
  }

  horizontalLine() {
    const [node] = this.curNodes
    if (node && ['paragraph', 'head'].includes(node[0].type)) {
      const path =
        node[0].type === 'paragraph' && !Node.string(node[0]) ? node[1] : Path.next(node[1])
      Transforms.insertNodes(
        this.editor,
        {
          type: 'hr',
          children: [{ text: '' }]
        },
        { at: path }
      )
      if (Editor.hasPath(this.editor, Path.next(path))) {
        Transforms.select(this.editor, Editor.start(this.editor, Path.next(path)))
      } else {
        Transforms.insertNodes(
          this.editor,
          {
            type: 'paragraph',
            children: [{ text: '' }]
          },
          { at: Path.next(path), select: true }
        )
      }
    }
  }

  list(mode: 'ordered' | 'unordered' | 'task') {
    const [node] = this.curNodes
    if (node && ['paragraph'].includes(node[0].type)) {
      const parent = Editor.parent(this.editor, node[1])
      if (parent[0].type === 'list-item' && !Path.hasPrevious(node[1])) {
        Transforms.setNodes(
          this.editor,
          {
            order: mode === 'ordered',
            task: mode === 'task'
          },
          { at: Path.parent(parent[1]) }
        )
        const listItems = Array.from<any>(
          Editor.nodes(this.editor, {
            match: (n) => n.type === 'list-item',
            at: Path.parent(parent[1]),
            reverse: true,
            mode: 'lowest'
          })
        )
        Transforms.setNodes(this.editor, { start: undefined }, { at: Path.parent(parent[1]) })
        for (let l of listItems) {
          Transforms.setNodes(
            this.editor,
            { checked: mode === 'task' ? l[0].checked || false : undefined },
            { at: l[1] }
          )
        }
      } else {
        const text = EditorUtils.cutText(this.editor, Editor.start(this.editor, node[1]))
        Transforms.delete(this.editor, { at: node[1] })
        Transforms.insertNodes(
          this.editor,
          {
            type: 'list',
            order: mode === 'ordered',
            task: mode === 'task',
            children: [
              {
                type: 'list-item',
                checked: mode === 'task' ? false : undefined,
                children: [{ type: 'paragraph', children: text }]
              }
            ]
          },
          { at: node[1], select: true }
        )
      }
    }
  }

  format(type: string) {
    EditorUtils.toggleFormat(this!.editor, type)
  }

  clear() {
    if (this.editor.selection)
      EditorUtils.clearMarks(this.editor, !Range.isCollapsed(this.editor.selection))
  }

  image() {
    runInAction(() => {
      this.store.openInsertNetworkImage = true
    })
  }

  localImage(type: 'image' | 'video' = 'image') {
    if (this.tree.openedNote) {
      MainApi.openDialog({
        properties:
          type === 'image'
            ? ['openFile', 'showHiddenFiles', 'multiSelections']
            : ['openFile', 'showHiddenFiles'],
        filters: [
          {
            extensions:
              type === 'image'
                ? ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
                : ['av1', 'mp4', 'webm', 'hevc'],
            name: 'Image'
          }
        ]
      }).then((res) => {
        if (res.filePaths.length) {
          this.store.insertFiles(res.filePaths)
        }
      })
    }
  }

  insertMedia() {
    EditorUtils.blur(this.store.editor)
    this.store.openInsertNetworkImage = true
  }

  save(callback?: () => void) {
    if (this.tree.openedNote) {
      const node = this.tree.openedNote
      if (node.ghost) {
        MainApi.createNewFile({
          defaultPath: node.filename
        }).then((res) => {
          if (res.filePath) {
            const id = nid()
            const now = Date.now()
            db.file
              .add({
                filePath: res.filePath,
                created: now,
                folder: false,
                sort: 0,
                schema: node.schema,
                cid: id,
                lastOpenTime: now
              })
              .then(() => {
                this.tree.currentTab.store.saveDoc$.next(null)
              })
            runInAction(() => {
              node.ghost = false
              node.filePath = res.filePath!
              node.cid = id
            })
            callback?.()
          }
        })
      } else {
        this.tree.currentTab.store.saveDoc$.next(null)
      }
    }
  }

  openSearch() {
    this.tree.currentTab?.store.setOpenSearch(true)
  }

  newTab() {
    this.tree.appendTab()
  }

  closeCurrentTab() {
    if (this.tree.tabs.length > 1) {
      this.tree.removeTab(this.tree.currentIndex)
    }
  }

  quickOpen() {
    quickOpen$.next(null)
  }

  undo() {
    try {
      this.tree.currentTab.store.editor.undo()
    } catch (e) {}
  }

  redo() {
    try {
      this.tree.currentTab.store.editor.redo()
    } catch (e) {}
  }
  openNote() {
    MainApi.openDialog({
      filters: [{ name: 'md', extensions: ['md'] }],
      properties: ['openFile']
    }).then(async (res) => {
      if (res.filePaths.length) {
        const path = res.filePaths[0]
        this.openSingleMd(path)
      }
    })
  }
  newNote() {
    if (this.tree.root) {
      let parent: ISpaceNode | IFileItem = this.tree.root
      if (this.tree.selectItem)
        parent = this.tree.selectItem.folder ? this.tree.selectItem : this.tree.selectItem.parent!
      else if (this.tree.openedNote) parent = this.tree.openedNote.parent!
      this.core.node.createDoc({ parent })
    } else {
      this.core.node.createDoc({ ghost: true })
    }
  }
  blur() {
    try {
      if (this.tree.openedNote) {
        const [node] = Editor.nodes(this.store.editor, {
          match: (n) => n.type === 'media'
        })
        if (node) {
          this.store.editor.selection = null
          selChange$.next(null)
        }
      }
    } catch (e) {}
  }
}
