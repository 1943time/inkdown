import {action, makeAutoObservable, observe, runInAction} from 'mobx'
import {BaseSelection, Editor, Element, Node, NodeEntry, Path, Range, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {GetFields, IFileItem} from '../index'
import React, {createContext, useContext} from 'react'
import {MediaNode, TableCellNode} from '../el'
import {Subject} from 'rxjs'
import {existsSync, mkdirSync, writeFileSync} from 'fs'
import {basename, isAbsolute, join, parse, relative} from 'path'
import {getOffsetLeft, getOffsetTop, mediaType} from './utils/dom'
import {treeStore} from '../store/tree'
import {MainApi} from '../api/main'
import {outputCache} from './output'
import {clearCodeCache} from './plugins/useHighlight'

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
  openInsertNetworkImage = false
  webview = false
  sel: BaseSelection | undefined
  focus = false
  readonly = false
  private ableToEnter = new Set(['paragraph', 'head', 'blockquote', 'code', 'table', 'list'])
  dragEl:null | HTMLElement = null
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
  history = false
  get doc() {
    return this.container?.querySelector('.content') as HTMLDivElement
  }

  constructor(editor: Editor, webview = false, history = false) {
    this.editor = editor
    this.webview = webview
    this.history = history
    this.dragStart = this.dragStart.bind(this)
    makeAutoObservable(this, {
      searchRanges: false,
      editor: false,
      tableCellNode: false,
      container: false,
      highlightCache: false,
      dragEl: false
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
  doRefreshHighlight() {
    setTimeout(action(() => {
      this.refreshHighlight = !this.refreshHighlight
    }), 60)
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
      for (let i = 0; i < parts.length; i++) {
        if (i !== 0) {
          const start = offset - keyWord.length
          for (let c of childrenMap) {
            if (c.start < offset && c.end > start) {
              const anchorOffset = start < c.start ? 0 : start - c.start
              const focusOffset = offset > c.end ? c.length : offset - c.start
              const range: Range = {
                anchor: {path: [...path, c.index], offset: anchorOffset},
                focus: {path: [...path, c.index], offset: focusOffset},
                current: matchCount === this.search.currentIndex,
                highlight: true
              }
              itemRanges.push(range)
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

  async insertFile(file: File) {
    if (file.path && mediaType(file.path) !== 'image') {
      return this.insertInlineNode(file.path.replace(/^file:\/\//, ''))
    }
    const mediaPath = await this.saveFile(file)
    this.insertInlineNode(mediaPath)
  }
  async saveFile(file: File | {name: string, buffer: ArrayBuffer}) {
    let targetPath = ''
    let mediaUrl = ''
    const buffer = file instanceof File ? await file.arrayBuffer() : file.buffer
    const base = basename(file.name)
    if (treeStore.root) {
      const imageDir = join(treeStore.root!.filePath, '.images')
      if (!existsSync(imageDir)) {
        mkdirSync(imageDir)
        await MainApi.mkdirp(imageDir)
        treeStore.watcher.onChange('update', imageDir)
      }
      targetPath = join(imageDir, base)
      mediaUrl = relative(join(treeStore.currentTab.current?.filePath || '', '..'), join(imageDir, base))
    } else {
      const path = await MainApi.getCachePath()
      const imageDir = join(path, 'images')
      if (!existsSync(imageDir)) mkdirSync(imageDir)
      targetPath = join(imageDir, base)
      mediaUrl = targetPath
    }
    writeFileSync(targetPath, new DataView(buffer))
    if (treeStore.root) treeStore.watcher.onChange('update', targetPath)
    return window.api.toUnix(mediaUrl)
  }
  insertDragFile(dragNode: IFileItem) {
    const note = treeStore.currentTab.current
    if (!note || !dragNode) return
    const path = relative(join(note.filePath, '..'), dragNode.filePath)
    this.insertInlineNode(path)
  }

  insertInlineNode(filePath: string) {
    const p = parse(filePath)
    const type = mediaType(filePath)
    const url = isAbsolute(filePath) ? filePath: window.api.toUnix(filePath)
    let node = ['image', 'audio', 'video', 'document'].includes(type) ? {
      type: 'media',
      url,
      alt: p.name,
      children: [{text: ''}]
    } : {text: p.name, url}
    const sel = this.editor.selection
    if (!sel || !Range.isCollapsed(sel)) return
    const [cur] = Editor.nodes<any>(this.editor, {
      match: n => Element.isElement(n),
      mode: 'lowest'
    })
    if ((node.type === 'media' && cur[0].type === 'paragraph') || (node.text && ['table-cell', 'paragraph'].includes(cur[0].type))) {
      Transforms.insertNodes(this.editor, node, {select: true})
    } else {
      const [par] = Editor.nodes<any>(this.editor, {
        match: n => Element.isElement(n) && ['table', 'code', 'head'].includes(n.type)
      })
      Transforms.insertNodes(this.editor, {
        type: 'paragraph',
        children: [node]
      }, {select: true, at: Path.next(par[1])})
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
  private toPath(el: HTMLElement) {
    const node = ReactEditor.toSlateNode(this.editor, el)
    const path = ReactEditor.findPath(this.editor, node)
    return [path, node] as [Path, Node]
  }
  private isListItem(el: HTMLElement) {
    return el.dataset.be === 'list-item'
  }
  dragStart(e: React.DragEvent, type?: string) {
    e.stopPropagation()
    this.readonly = true
    type MovePoint = {
      el: HTMLDivElement,
        direction: 'top' | 'bottom',
      top: number
      left: number
    }
    const ableToEnter = type === 'list-item' ? new Set(['list-item']) : this.ableToEnter
    let mark: null | HTMLDivElement = null
    const els = document.querySelectorAll<HTMLDivElement>('[data-be]')
    const points: MovePoint[] = []
    for (let el of els) {
      if (!ableToEnter.has(el.dataset.be!)) continue
      const top = getOffsetTop(el, this.container!)
      const left = getOffsetLeft(el, this.container!)
      if (!el.previousSibling && el.parentElement?.dataset.be !== 'list-item') {
        points.push({
          el: el,
          direction: 'top',
          left: left,
          top: top - 2
        })
      }
      points.push({
        el: el,
        left: this.isListItem(el) ? left - 20: left,
        direction: 'bottom',
        top: top + el.clientHeight + 2
      })
    }
    let last:MovePoint | null = null
    const dragover = (e: DragEvent) => {
      e.preventDefault()
      const target = e.target as HTMLElement
      const top = e.clientY - 40 + this.container!.scrollTop
      let distance = 1000000
      let cur: MovePoint | null = null
      for (let p of points) {
        let curDistance = Math.abs(p.top - top)
        if (curDistance < distance) {
          cur = p
          distance = curDistance
        }
      }
      if (cur) {
        last = cur
        const width = this.isListItem(last.el) ? last.el.clientWidth + 20 + 'px': last.el.clientWidth + 'px'
        if (!mark) {
          mark = document.createElement('div')
          mark.classList.add('move-mark')
          mark.style.width = width
          mark.style.transform = `translate(${last.left}px, ${last.top}px)`
          this.container!.append(mark)
        } else {
          mark.style.width = width
          mark.style.transform = `translate(${last.left}px, ${last.top}px)`
        }
      }
    }
    window.addEventListener('dragover', dragover)
    window.addEventListener('dragend', action(() => {
      window.removeEventListener('dragover', dragover)
      this.readonly = false
      if (mark) this.container!.removeChild(mark)
      if (last && this.dragEl) {
        const [dragPath, dragNode] = this.toPath(this.dragEl)
        const [targetPath] = this.toPath(last.el)
        let toPath = last.direction === 'top' ? targetPath : Path.next(targetPath)
        if (!Path.equals(targetPath, dragPath)) {
          const parent = Node.parent(this.editor, dragPath)
          outputCache.delete(dragNode)
          if (dragNode.type === 'code') {
            clearCodeCache(dragNode)
          }
          if (dragNode.type === 'table') {
            setTimeout(action(() => {
              treeStore.size = JSON.parse(JSON.stringify(treeStore.size))
            }))
          }
          if (Path.equals(Path.parent(targetPath), Path.parent(dragPath)) && Path.compare(dragPath, targetPath) === -1) {
            toPath = Path.previous(toPath)
          }
          Transforms.moveNodes(this.editor, {
            at: dragPath,
            to: toPath
          })
          if (parent.children?.length === 1) {
            Transforms.delete(this.editor, {at: Path.parent(dragPath)})
          }
        }
      }
      this.dragEl!.draggable = false
      this.dragEl = null
    }), {once: true})
  }
}






