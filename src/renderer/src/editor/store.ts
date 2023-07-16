import {action, makeAutoObservable, observe, runInAction} from 'mobx'
import {BaseRange, BaseSelection, Editor, Element, Node, NodeEntry, Path, Range, Text, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {GetFields, IFileItem} from '../index'
import {createContext, useContext} from 'react'
import {MediaNode, TableCellNode} from '../el'
import {of, Subject} from 'rxjs'
import {existsSync, mkdirSync, writeFileSync} from 'fs'
import {join, parse, relative} from 'path'
import {mediaType} from './utils/dom'
import {treeStore} from '../store/tree'
import {nanoid} from 'nanoid'
import {MainApi} from '../api/main'

export const EditorStoreContext = createContext<EditorStore | null>(null)
export const useEditorStore = () => {
  return useContext(EditorStoreContext)!
}
export class EditorStore {
  editor!: Editor
  search = {
    text: '',
    currentIndex: 0,
    refresh: false,
  }
  count = {
    words: 0,
    characters: 0
  }
  webview = false
  sel: BaseSelection | undefined
  focus = false
  openSearch = false
  focusSearch = false
  docChanged = false
  searchRanges: (Range[])[] = []
  highlightCache = new Map<object, Range[]>()
  private searchTimer = 0
  matchCount = 0
  refreshFloatBar = false
  refreshTableAttr = false
  mediaNode$ = new Subject<NodeEntry<MediaNode> | null>()
  tableCellNode: null | NodeEntry<TableCellNode> = null
  refreshHighlight = false
  pauseCodeHighlight = false
  domRect: DOMRect | null = null
  container: null | HTMLDivElement = null

  get doc() {
    return this.container?.querySelector('.content') as HTMLDivElement
  }

  constructor(editor: Editor, webview = false) {
    this.editor = editor
    this.webview = webview
    makeAutoObservable(this, {
      searchRanges: false,
      editor: false,
      tableCellNode: false,
      container: false,
      highlightCache: false
    })
    observe(this.search, 'text', () => {
      this.matchCount = 0
    })
  }
  hideRanges() {
    if (this.highlightCache.size) {
      setTimeout(() => {
        runInAction(() => {
          this.highlightCache.clear()
          this.refreshHighlight = !this.refreshHighlight
        })
      }, 60)
    }
  }
  offsetTop(node: HTMLElement) {
    let top = this.openSearch ? 46 : 0
    const doc = this.doc
    while (doc?.contains(node.offsetParent) && doc !== node) {
      top += node.offsetTop
      node = node.offsetParent as HTMLElement
    }
    return top
  }

  offsetLeft(node: HTMLElement) {
    let left = 0
    const doc = this.doc
    while (doc.contains(node) && doc !== node) {
      left += node.offsetLeft
      node = node.offsetParent as HTMLElement
    }
    return left
  }
  matchSearch(scroll: boolean = true) {
    this.highlightCache.clear()
    this.searchRanges = []
    if (!this.search.text) {
      this.search.currentIndex = 0
      this.matchCount = 0
      this.refreshHighlight = !this.refreshHighlight
      return
    }
    const nodes = Array.from(Editor.nodes<any>(this.editor, {
      at: [],
      match: n => Element.isElement(n) && ['paragraph', 'table-cell', 'code-line', 'head'].includes(n.type),
    }))
    let matchCount = 0
    const keyWord = this.search.text.toLowerCase()
    for (let n of nodes) {
      const [el, path] = n
      const str = Node.string(el).toLowerCase()
      if (!str || /^\s+$/.test(str) || !str.includes(keyWord)) {
        continue
      }
      let offset = 0
      const parts = str.split(keyWord)
      let length = 0
      const children = el.children as any[] || []
      const childrenMap = children.map((e, i) => {
        const end = length + e.text.length
        const data = {index: i, start: length, end, length: e.text.length}
        length = end
        return data
      })
      let ranges: Range[] = []
      let itemRanges: Range[] = []
      let openMatch = false
      for (let i = 0; i < parts.length; i++) {
        if (i !== 0) {
          const start = offset - keyWord.length
          for (let c of childrenMap) {
            if (c.start < offset && c.end > start) {
              const anchorOffset = start < c.start ? 0 : start - c.start
              const focusOffset = offset > c.end ? c.length : offset - c.start
              const range:Range = {
                anchor: {path: [...path, c.index], offset: anchorOffset},
                focus: {path: [...path, c.index], offset: focusOffset},
                current: matchCount === this.search.currentIndex,
                highlight: true
              }
              itemRanges.push(range)
              openMatch = true
              ranges.push(range)
              if (c.end >= offset) {
                matchCount++
                this.searchRanges.push(itemRanges)
                itemRanges = []
              }
            }
          }
        }
        offset += parts[i].length + keyWord.length
      }
      this.highlightCache.set(el, ranges)
    }
    this.matchCount = matchCount
    if (this.search.currentIndex > matchCount - 1) {
      this.search.currentIndex = 0
    }
    this.refreshHighlight = !this.refreshHighlight
    if (scroll) requestIdleCallback(() => this.toPoint())
  }
  setOpenSearch(open: boolean) {
    this.openSearch = open
    if (!open) {
      this.highlightCache.clear()
      this.searchRanges = []
      this.refreshHighlight = !this.refreshHighlight
    } else {
      this.focusSearch = !this.focusSearch
      if (this.search.text) {
        this.matchSearch()
        this.toPoint()
      }
    }
  }
  setSearchText(text?: string) {
    this.searchRanges = []
    this.search.currentIndex = 0
    this.search.text = text || ''
    clearTimeout(this.searchTimer)
    this.searchTimer = window.setTimeout(() => {
      this.matchSearch()
    }, 300)
  }


  private changeCurrent() {
    this.searchRanges.forEach((r, i) => {
      if (i === this.search.currentIndex) {
        r.forEach(e => {
          e.current = true
        })
      } else {
        r.forEach(e => {
          e.current = false
        })
      }
    })
    this.refreshHighlight = !this.refreshHighlight
  }
  nextSearch() {
    if (this.search.currentIndex === this.searchRanges.length - 1) {
      this.search.currentIndex = 0
    } else {
      this.search.currentIndex++
    }
    this.changeCurrent()
    this.toPoint()
  }

  prevSearch() {
    if (this.search.currentIndex === 0) {
      this.search.currentIndex = this.searchRanges.length - 1
    } else {
      this.search.currentIndex--
    }
    this.changeCurrent()
    this.toPoint()
  }

  setState<T extends GetFields<EditorStore>>(value: (state: EditorStore) => void) {
    if (value instanceof Function) {
      value(this)
    } else {
      for (let key of Object.keys(value)) {
        this[key] = value[key]
      }
    }
  }

  insertFile(file: File) {
    if (file.path) {
      this.insertInlineNode(file.path.replace(/^file:\/\//, ''))
    } else {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = async () => {
        const base64 = reader.result as string
        if (base64) {
          let base64Image = base64.split(';base64,').pop()!
          const p = parse(file.name)
          const name = nanoid() + p.ext
          let targetPath = ''
          let mediaUrl = ''
          if (treeStore.root) {
            const imageDir = join(treeStore.root!.filePath, '.images')
            if (!existsSync(imageDir)) {
              mkdirSync(imageDir)
              await MainApi.mkdirp(imageDir)
            }
            targetPath = join(imageDir, name)
            mediaUrl = relative(join(treeStore.currentTab.current?.filePath || '', '..'), join(imageDir, name))
          } else {
            const path = await MainApi.getCachePath()
            const imageDir = join(path, 'images')
            if (!existsSync(imageDir)) mkdirSync(imageDir)
            targetPath = join(imageDir, name)
            mediaUrl = targetPath
          }
          writeFileSync(targetPath, base64Image, {encoding: 'base64'})
          this.insertInlineNode(mediaUrl)
        }
      }
    }
  }

  insertDragFile(dragNode: IFileItem) {
    const note = treeStore.currentTab.current
    if (!note || !dragNode) return
    const path = relative(join(note.filePath, '..'), dragNode.filePath)
    this.insertInlineNode(path)
  }
  insertInlineNode(filePath: string) {
    const p = parse(filePath)
    let node = mediaType(filePath) === 'image' ? {type: 'media', url: filePath, alt: p.name, children: [{text: ''}]} : {text: p.name, url: filePath}
    const sel = this.editor.selection
    const type = mediaType(filePath)
    if (!sel || !Range.isCollapsed(sel)) return
    const [text] = Editor.nodes<any>(this.editor, {
      match: n => Text.isText(n)
    })
    const beforeText = text[0].text.slice(0, sel.focus.offset)
    const afterText = text[0].text.slice(sel.focus.offset)
    Transforms.select(this.editor, {
      anchor: {path: text[1], offset: 0},
      focus: {path: text[1], offset: text[0].text.length}
    })
    if (type!== 'image') node = {...text[0], ...node}
    Transforms.insertNodes(this.editor, [
      {...text[0], text: beforeText},
      node,
      {...text[0], text: afterText}
    ])
    Transforms.select(this.editor, {
      anchor: {path: sel.focus.path, offset: beforeText.length + type === 'image' ? 1 : p.name.length},
      focus: {path: sel.focus.path, offset: beforeText.length + type === 'image' ? 1 : p.name.length}
    })
    if (type === 'image') {
      Transforms.select(this.editor, Path.next(sel.focus.path))
    } else {
      const targetPath = sel.anchor.offset === 0 ? sel.focus.path: Path.next(sel.focus.path)
      Transforms.select(this.editor, {
        anchor: Editor.end(this.editor, targetPath),
        focus: Editor.end(this.editor, targetPath),
      })
    }
  }
  private toPoint() {
    const cur = this.searchRanges[this.search.currentIndex]
    if (!cur?.length) return
    const node = Node.get(this.editor, Path.parent(cur[0].focus.path))
    const dom = ReactEditor.toDOMNode(this.editor, node)
    if (dom) {
      const top = this.offsetTop(dom)
      if (top > this.container!.scrollTop && top < this.container!.scrollTop + window.innerHeight) return
      this.container!.scroll({
        top: top - 100
      })
    }
  }
}






