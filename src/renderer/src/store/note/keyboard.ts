import { Editor, Element, Node, Path, Range, Transforms } from 'slate'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { TabStore } from './tab'

export class KeyboardTask {
  constructor(private readonly tab: TabStore) {}
  get store() {
    return this.tab.store
  }
  get editor() {
    return this.tab.editor
  }
  get curNodes() {
    return Editor.nodes<any>(this.editor, {
      mode: 'lowest',
      match: (m) => Element.isElement(m)
    })
  }

  private openFloatBar() {
    setTimeout(() => {
      try {
        const domRange = window.getSelection()?.getRangeAt(0)
        const rect = domRange?.getBoundingClientRect()
        if (rect) {
          this.tab.setState({ domRect: rect })
        }
      } catch (e) {}
    })
  }
  toggleFormat(type: 'bold' | 'italic' | 'strikethrough' | 'code') {
    EditorUtils.toggleFormat(this.editor, type)
  }
  clearFormat() {
    EditorUtils.clearMarks(this.editor, true)
    EditorUtils.highColor(this.editor)
  }
  selectAll() {
    const [node] = this.curNodes
    if (!node) {
      return
    }
    if (node[0]?.type === 'table-cell') {
      Transforms.select(this.editor, Path.parent(Path.parent(node[1])))
    } else {
      Transforms.select(this.editor, {
        anchor: Editor.start(this.editor, []),
        focus: Editor.end(this.editor, [])
      })
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
  selectLine() {
    if (this.editor.selection) {
      Transforms.select(this.editor, Path.parent(this.editor.selection.anchor.path))
      const text = Node.leaf(this.editor, this.editor.selection.anchor.path).text || ''
      if (text) {
        this.openFloatBar()
      }
    }
  }

  selectFormat() {
    if (this.editor.selection) {
      Transforms.select(this.editor, this.editor.selection.anchor.path)
      if (!Range.isCollapsed(this.editor.selection)) {
        this.openFloatBar()
      }
    }
  }

  async attach(data: { filePath?: string; file?: File; url?: string }) {
    const insertPath = EditorUtils.findMediaInsertPath(this.editor)
    // if (this.core.tree.openedNote && insertPath) {
    //   let realName = ''
    //   let key = ''
    //   let file: File | null = null
    //   if (this.core.desktop) {
    //     if (data.filePath) {
    //       const path = data.filePath
    //       file = await this.core.local.copyFile(path)
    //       realName = window.api.path.basename(path)
    //       key = file.name
    //     }
    //   } else if (data.file) {
    //     key = nid() + extname(data.file.name)
    //     realName = data.file.name
    //     file = data.file
    //   }
    //   if (!realName || !file) {
    //     return
    //   }
    //   await db.file.add({
    //     name: key,
    //     created: Date.now(),
    //     size: file.size,
    //     spaceId: this.core.tree.root.cid,
    //     data: file,
    //     synced: 0
    //   })
    //   Transforms.insertNodes(
    //     this.editor,
    //     {
    //       type: 'attach',
    //       id: key,
    //       size: file.size,
    //       name: realName,
    //       children: [{ text: '' }]
    //     },
    //     { at: insertPath, select: true }
    //   )
    //   const next = Editor.next(this.editor, { at: insertPath })
    //   if (next?.[0].type === 'paragraph' && !Node.string(next[0])) {
    //     Transforms.delete(this.editor, { at: next[1] })
    //   }
    //   selChange$.next(this.editor.selection ? Path.parent(this.editor.selection.anchor.path) : null)
    // }
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
      if (!Range.isCollapsed(this.editor.selection!)) this.openFloatBar()
    }
  }

  async pastePlainText() {
    const text = await navigator.clipboard.readText()
    if (text) {
      const [node] = this.curNodes
      if (node[0].type === 'table-cell') {
        Editor.insertText(this.editor, text.replace(/\n/g, ' '))
      } else {
        Editor.insertText(this.editor, text)
      }
    }
  }

  async pasteMarkdownCode() {
    const md = window.api.getClipboardText()
    if (!md) return
    this.insertMarkdown(md)
  }

  async insertMarkdown(md: string) {
    const [node] = this.curNodes
    const res = await this.store.local.getSingleDocSchemaByMd(md)
    if (node[0].type === 'paragraph' && !Node.string(node[0]) && node[0].children.length === 1) {
      Transforms.delete(this.editor, { at: node[1] })
      Transforms.insertNodes(this.editor, res, { at: node[1], select: true })
      return
    }
    if (
      res[0]?.type === 'paragraph' &&
      ['paragraph', 'table-cell', 'head'].includes(node[0].type)
    ) {
      const first = res.shift()
      Editor.insertNode(this.editor, first.children)
    }
    if (res.length) {
      if (['code', 'table-cell', 'inline-katex'].includes(node[0].type)) {
        const [block] = Editor.nodes<any>(this.editor, {
          match: (n) => ['table', 'code', 'paragraph', 'head'].includes(n.type),
          mode: 'lowest'
        })
        Transforms.insertNodes(this.editor, res, {
          at: Path.next(block[1]),
          select: true
        })
      } else {
        Transforms.insertNodes(this.editor, res, {
          at: Path.next(node[1]),
          select: true
        })
      }
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
      const el = {
        type: 'code',
        language: lang ? lang : undefined,
        code,
        children: [{ text: '' }],
        render: type === 'html' ? true : undefined,
        katex: type === 'katex'
      }
      Transforms.insertNodes(this.editor, el, { at: path })
      setTimeout(() => {
        const editor = this.tab.codeMap.get(el)
        if (editor) {
          EditorUtils.focusAceEnd(editor)
        }
      }, 30)
    }
  }

  inlineKatex() {
    const sel = this.tab.editor.selection
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

  media() {}

  localImage(type: 'image' | 'video' = 'image') {
    const doc = this.tab.state.doc
    if (doc) {
      this.tab.store.system
        .showOpenDialog({
          filters: [
            {
              extensions:
                type === 'image'
                  ? ['png', 'svg', 'jpg', 'jpeg', 'webp', 'gif']
                  : ['av1', 'mp4', 'webm', 'hevc'],
              name: 'media'
            }
          ],
          properties: ['openFile']
        })
        .then(async (res) => {
          if (res.filePaths.length) {
            this.tab.insertMultipleImages(res.filePaths)
          }
        })
    }
  }

  // localVideo() {
  //   if (this.core.tree.openedNote) {
  //     fileOpen({
  //       mimeTypes: ['video/*']
  //     }).then(async (res) => {
  //       const id = nid()
  //       const now = Date.now()
  //       const ext = res.name.match(/\.\w+$/i)
  //       const path = EditorUtils.findMediaInsertPath(this.editor)
  //       const docId = this.core.tree.openedNote?.cid
  //       if (ext && docId && path) {
  //         const name = id + ext
  //         await db.file.add({
  //           created: now,
  //           name,
  //           data: res,
  //           synced: 0,
  //           spaceId: this.core.tree.root.cid,
  //           size: res.size
  //         })
  //         Transforms.insertNodes(
  //           this.editor,
  //           { type: 'media', id: name, children: [{ text: '' }] },
  //           { select: true, at: path }
  //         )
  //       }
  //     })
  //   }
  // }

  openSearch() {
    this.tab.setOpenSearch(true)
  }

  newTab() {
    this.tab.note.createTab()
  }

  closeCurrentTab() {
    const { tabs, tabIndex } = this.tab.note.state
    if (tabs.length > 1) {
      this.tab.note.removeTab(tabIndex)
    } else {
      window.electron.ipcRenderer.send('close-window')
    }
  }

  undo() {
    try {
      this.tab.editor.undo()
    } catch (e) {}
  }

  redo() {
    try {
      this.tab.editor.redo()
    } catch (e) {}
  }
  newNote() {
    // let parent: ISpaceNode | IFileItem = this.core.tree.root
    // if (this.core.tree.selectItem)
    //   parent = this.core.tree.selectItem.folder
    //     ? this.core.tree.selectItem
    //     : this.core.tree.selectItem.parent!
    // else if (this.core.tree.openedNote) parent = this.core.tree.openedNote.parent!
    // this.core.menu.createDoc({ parent })
  }
  blur() {
    const doc = this.tab.state.doc
    try {
      if (doc) {
        const [node] = Editor.nodes(this.tab.editor, {
          match: (n) => n.type === 'media'
        })
        if (node) {
          this.tab.editor.selection = null

          this.tab.setState({ domRect: null })
        }
      }
    } catch (e) {}
  }
}
