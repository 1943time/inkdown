import { withMarkdown } from '@/editor/plugins'
import { createEditor, Editor, Element, Node, Path, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { ReactEditor, withReact } from 'slate-react'
import { Ace, Range as AceRange } from 'ace-builds'
import { Range as SlateRange } from 'slate'
import { Store } from '../store'
import { IDoc } from 'types/model'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { getOffsetLeft, getOffsetTop } from '@/utils/dom'
import { KeyboardTask } from './keyboard'
import { Subject } from 'rxjs'
import { TableLogic } from './table'
import { StructStore } from '../struct'
import { observable } from 'mobx'

const state = {
  path: null as null | Path,
  langCompletionText: '',
  startDragging: false,
  showFloatBar: false,
  historyView: false,
  readonly: false,
  insertCompletionText: '',
  docs: [] as IDoc[],
  inputComposition: false,
  openSearch: false,
  openReplace: false,
  focus: false,
  currentIndex: 0,
  focusSearch: false,
  docChanged: false,
  openLangCompletion: false,
  openQuickLinkComplete: false,
  openInsertCompletion: false,
  domRect: null as null | DOMRect,
  refreshHighlight: false,
  search: {
    replace: false,
    index: 0,
    keyword: '',
    replaceText: '',
    searchRanges: [] as {
      range?: SlateRange
      markerId?: number
      aceRange?: InstanceType<typeof AceRange>
      editorPath?: number[]
    }[]
  },
  get doc() {
    return this.docs[this.currentIndex]
  }
}

export class TabStore extends StructStore<typeof state> {
  keyboard: KeyboardTask
  table: TableLogic
  constructor(public readonly store: Store) {
    super(state)
    this.dragStart = this.dragStart.bind(this)
    this.keyboard = new KeyboardTask(this)
    this.table = new TableLogic(this)
  }
  get note() {
    return this.store.note
  }
  editor = withMarkdown(withReact(withHistory(createEditor())), this)
  selChange$ = new Subject<Path | null>()
  saveDoc$ = new Subject()
  externalChange$ = new Subject<string>()
  uploadFileCache = new WeakMap<object, File>()
  manual = false
  dragEl: null | HTMLElement = null
  range?: Range
  container?: HTMLDivElement
  highlightCache = new Map<object, SlateRange[]>()
  codeMap = new Map<object, Ace.Editor>()
  searchTimer = 0
  scrolling = false
  private ableToEnter = new Set([
    'paragraph',
    'head',
    'blockquote',
    'code',
    'table',
    'list',
    'media',
    'attach'
  ])
  doManual() {
    this.manual = true
    setTimeout(() => (this.manual = false), 30)
  }
  refreshHighlight() {
    this.setState((state) => {
      state.refreshHighlight = !state.refreshHighlight
    })
  }
  setOpenSearch(open: boolean) {
    this.setState((state) => {
      state.openSearch = open
    })
    this.setState({ domRect: null })
    if (!open) {
      this.clearDocAllMarkers()
      this.highlightCache.clear()
      this.setState((state) => {
        state.search.searchRanges = []
      })
    } else {
      this.setState((state) => {
        state.focusSearch = !state.focusSearch
        if (state.search.keyword) {
          this.matchSearch()
          this.toPoint()
        }
      })
    }
  }

  clearDocAllMarkers() {
    const ranges = this.state.search.searchRanges
    if (ranges.length) {
      for (const item of ranges) {
        if (item.editorPath) {
          const code = this.getCodeEditor(item.editorPath)
          if (code) {
            EditorUtils.clearAceMarkers(code)
          }
        }
      }
    }
  }

  setSearchText(text?: string) {
    this.setState((state) => {
      state.search.keyword = text || ''
      state.search.index = 0
      state.search.searchRanges = []
    })
    clearTimeout(this.searchTimer)
    this.searchTimer = window.setTimeout(() => {
      this.matchSearch()
    }, 300)
  }

  private changeCurrent() {
    const { search } = this.state
    search.searchRanges.forEach((r, j) => {
      if (r.range) {
        r.range.current = j === search.index
      } else if (r.editorPath) {
        const code = this.getCodeEditor(r.editorPath)
        if (code) {
          const marker = code.session.getMarkers()[r.markerId!]
          const cl = j === search.index ? 'match-current' : 'match-text'
          if (marker && cl !== marker.clazz) {
            code.session.removeMarker(r.markerId!)
            const id = code.session.addMarker(marker.range!, cl, 'text', false)
            r.markerId = id
          }
        }
      }
    })
  }

  nextSearch() {
    const { search } = this.state
    if (search.index === search.searchRanges.length - 1) {
      this.setState((state) => {
        state.search.index = 0
      })
    } else {
      this.setState((state) => {
        state.search.index++
      })
    }
    this.changeCurrent()
    this.toPoint()
  }

  prevSearch() {
    const { search } = this.state
    if (search.index === 0) {
      this.setState((state) => {
        state.search.index = search.searchRanges.length - 1
      })
    } else {
      this.setState((state) => {
        state.search.index--
      })
    }
    this.changeCurrent()
    this.toPoint()
  }
  matchSearch(scroll: boolean = true) {
    this.highlightCache.clear()
    const { search } = this.state
    this.setState((state) => {
      state.search.searchRanges = []
    })
    if (!search.keyword) {
      this.setState((state) => {
        state.search.index = 0
      })
      return
    }
    const nodes = Array.from(
      Editor.nodes<any>(this.editor, {
        at: [],
        match: (n) =>
          Element.isElement(n) && ['paragraph', 'table-cell', 'head', 'code'].includes(n.type)
      })
    )
    let matchCount = 0
    const keyWord = search.keyword.toLowerCase()
    let allRanges: typeof search.searchRanges = []
    for (let n of nodes) {
      const [el, path] = n
      if (el.type === 'code') {
        const editor = this.codeMap.get(el)
        if (editor) {
          EditorUtils.clearAceMarkers(editor)
          const documentText = editor.session.getDocument().getValue()
          const lines = documentText.split('\n')
          const regex = new RegExp(keyWord, 'g')
          for (let i = 0; i < lines.length; i++) {
            const item = lines[i]
            const match = item.matchAll(regex)
            for (const m of match) {
              const range = new AceRange(i, m.index!, i, m.index! + m[0].length)
              const data: (typeof search.searchRanges)[number] = {
                aceRange: range,
                editorPath: path
              }
              const markerId = editor.session.addMarker(
                range,
                matchCount === search.index ? 'match-current' : 'match-text',
                'text',
                false
              )
              data.markerId = markerId
              allRanges.push(data)
              matchCount++
            }
          }
        }
      } else {
        const str = Node.string(el).toLowerCase()
        if (!str || /^\s+$/.test(str) || !str.includes(keyWord)) {
          continue
        }
        let ranges: typeof search.searchRanges = []
        for (let i = 0; i < el.children.length; i++) {
          const text = el.children[i].text?.toLowerCase()
          if (text && text.includes(keyWord)) {
            const sep = text.split(keyWord)
            let offset = 0
            for (let j = 0; j < sep.length; j++) {
              if (j === 0) {
                offset += sep[j].length
                continue
              }
              ranges.push({
                range: {
                  anchor: {
                    path: [...path, i],
                    offset: offset
                  },
                  focus: {
                    path: [...path, i],
                    offset: offset + keyWord.length
                  },
                  current: matchCount === search.index,
                  highlight: true
                }
              })
              offset += sep[j].length + keyWord.length
              matchCount++
            }
          }
        }
        allRanges.push(...ranges)
        this.highlightCache.set(
          el,
          ranges.map((r) => r.range!)
        )
      }
    }
    if (search.index > matchCount - 1) {
      search.index = 0
    }
    this.setState((state) => {
      state.search.searchRanges = allRanges
    })
    if (scroll) setTimeout(() => this.toPoint(), 30)
  }
  getCodeEditor(path: number[]) {
    const el = Node.get(this.editor, path)
    if (Element.isElement(el) && el.type === 'code') {
      return this.codeMap.get(el)
    }
    return null
  }
  private toPoint() {
    const { search } = this.state
    try {
      const cur = search.searchRanges[search.index]
      if (!cur) return
      let dom: null | HTMLElement = null
      if (cur.range) {
        const node = Node.get(this.editor, Path.parent(cur.range.focus.path))
        dom = ReactEditor.toDOMNode(this.editor, node)
      } else if (cur.editorPath && cur.aceRange) {
        const code = this.getCodeEditor(cur.editorPath)
        if (code) {
          const lines = code.container.querySelectorAll('.ace_line')
          dom = lines[cur.aceRange.start.row] as HTMLElement
        }
      }
      if (dom) {
        const top = getOffsetTop(dom, this.container!) - 80
        if (
          top > this.container!.scrollTop + 40 &&
          top < this.container!.scrollTop + (window.innerHeight - 120)
        ) {
          return
        }
        this.container!.scroll({
          top: top - 100
        })
      }
    } catch (e) {
      console.error('toPoint', e)
    }
  }
  hideRanges() {
    this.clearDocAllMarkers()
    if (this.highlightCache.size) {
      setTimeout(() => {
        this.highlightCache.clear()
        this.refreshHighlight()
      }, 60)
    }
  }
  dragStart(e: React.MouseEvent) {
    e.stopPropagation()
    type MovePoint = {
      el: HTMLDivElement
      direction: 'top' | 'bottom'
      top: number
      left: number
    }
    const ableToEnter =
      this.dragEl?.dataset?.be === 'list-item'
        ? new Set([
            'paragraph',
            'head',
            'blockquote',
            'code',
            'table',
            'list',
            'list-item',
            'media',
            'attach'
          ])
        : this.ableToEnter
    let mark: null | HTMLDivElement = null
    const els = document.querySelectorAll<HTMLDivElement>('[data-be]')
    const points: MovePoint[] = []
    for (let el of els) {
      if (!ableToEnter.has(el.dataset.be!)) continue
      if (el.classList.contains('frontmatter')) continue
      const pre = el.previousSibling as HTMLElement
      if (
        el.dataset.be === 'paragraph' &&
        this.dragEl?.dataset.be === 'list-item' &&
        (!pre || pre.classList.contains('check-item'))
      ) {
        continue
      }
      if (el === this.dragEl) continue
      const top = getOffsetTop(el, this.container!)
      const left = getOffsetLeft(el, this.container!)
      points.push({
        el: el,
        direction: 'top',
        left: el.dataset.be === 'list-item' && !el.classList.contains('task') ? left - 16 : left,
        top: top - 2
      })
      points.push({
        el: el,
        left: el.dataset.be === 'list-item' && !el.classList.contains('task') ? left - 16 : left,
        direction: 'bottom',
        top: top + el.clientHeight + 2
      })
    }
    let last: MovePoint | null = null
    this.setState({ readonly: true, startDragging: true })
    const dragover = (e: MouseEvent) => {
      e.preventDefault()
      if ((e.clientY > window.innerHeight - 30 || e.clientY < 70) && !this.scrolling) {
        this.container?.scrollBy({ top: e.clientY < 70 ? -400 : 400, behavior: 'smooth' })
        this.scrolling = true
        setTimeout(() => {
          this.scrolling = false
        }, 200)
      }
      const top = e.clientY - 40 + this.container!.scrollTop
      let distance = 1000000
      let cur: MovePoint | null = null
      for (let p of points) {
        if (
          this.dragEl?.tagName.toLowerCase().startsWith('h') &&
          !p.el.parentElement?.getAttribute('data-slate-editor')
        ) {
          continue
        }
        let curDistance = Math.abs(p.top - top)
        if (curDistance < distance) {
          cur = p
          distance = curDistance
        }
      }
      if (cur) {
        last = cur
        const width =
          last.el.dataset.be === 'list-item'
            ? last.el.clientWidth + 20 + 'px'
            : last.el.clientWidth + 'px'
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
    window.addEventListener('mousemove', dragover)
    window.addEventListener(
      'mouseup',
      () => {
        window.removeEventListener('mousemove', dragover)
        this.setState({ readonly: false, startDragging: false })
        if (mark) this.container!.removeChild(mark)
        if (last && this.dragEl) {
          let [dragPath, dragNode] = this.toPath(this.dragEl)
          let [targetPath] = this.toPath(last.el)
          let toPath = last.direction === 'top' ? targetPath : Path.next(targetPath)
          if (!Path.equals(targetPath, dragPath)) {
            const parent = Node.parent(this.editor, dragPath)
            if (
              Path.equals(Path.parent(targetPath), Path.parent(dragPath)) &&
              Path.compare(dragPath, targetPath) === -1
            ) {
              toPath = Path.previous(toPath)
            }
            let delPath = Path.parent(dragPath)
            const targetNode = Node.get(this.editor, targetPath)
            if (dragNode.type === 'list-item') {
              if (targetNode.type !== 'list-item') {
                Transforms.delete(this.editor, { at: dragPath })
                Transforms.insertNodes(
                  this.editor,
                  {
                    ...parent,
                    children: [EditorUtils.copy(dragNode)]
                  },
                  { at: toPath, select: true }
                )
                if (parent.children?.length === 1) {
                  if (EditorUtils.isNextPath(Path.parent(dragPath), targetPath)) {
                    delPath = Path.next(Path.parent(dragPath))
                  } else {
                    delPath = Path.parent(dragPath)
                  }
                }
              } else {
                Transforms.moveNodes(this.editor, {
                  at: dragPath,
                  to: toPath
                })
              }
            } else {
              if (
                !Path.hasPrevious(toPath) &&
                Node.get(this.editor, Path.parent(toPath))?.type === 'list-item'
              ) {
                toPath = Path.next(toPath)
              }
              Transforms.moveNodes(this.editor, {
                at: dragPath,
                to: toPath
              })
            }
            if (parent.children?.length === 1) {
              if (
                Path.equals(Path.parent(toPath), Path.parent(delPath)) &&
                Path.compare(toPath, delPath) !== 1
              ) {
                delPath = Path.next(delPath)
              }
              Transforms.delete(this.editor, { at: delPath })
            }
          }
          if (dragNode?.type !== 'media') this.dragEl!.draggable = false
        }
        this.dragEl = null
      },
      { once: true }
    )
  }

  private toPath(el: HTMLElement) {
    const node = ReactEditor.toSlateNode(this.editor, el)
    const path = ReactEditor.findPath(this.editor, node)
    return [path, node] as [Path, Node]
  }

  selectPrev(path: Path) {
    const prePath = EditorUtils.findPrev(this.editor, path)
    if (prePath) {
      const node = Node.get(this.editor, prePath)
      if (node.type === 'code') {
        const ace = this.codeMap.get(node)
        if (ace) {
          EditorUtils.focusAceEnd(ace)
        }
        return true
      } else {
        Transforms.select(this.editor, Editor.end(this.editor, prePath))
      }
      EditorUtils.focus(this.editor)
      return true
    } else {
      this.container?.querySelector<HTMLInputElement>('.page-title')?.focus()
      return
    }
  }
  selectNext(path: Path) {
    const nextPath = EditorUtils.findNext(this.editor, path)
    if (nextPath) {
      const node = Node.get(this.editor, nextPath)
      if (node.type === 'code') {
        const ace = this.codeMap.get(node)
        if (ace) {
          EditorUtils.focusAceStart(ace)
        }
        return true
      } else {
        Transforms.select(this.editor, Editor.start(this.editor, nextPath))
      }
      EditorUtils.focus(this.editor)
      return true
    } else {
      return false
    }
  }
  selectMedia(path: Path) {
    Transforms.select(this.editor, path)
    try {
      const top = this.container!.scrollTop
      const dom = ReactEditor.toDOMNode(this.editor, Node.get(this.editor, path))
      const offsetTop = getOffsetTop(dom, this.container!)
      if (top > offsetTop) {
        this.container!.scroll({
          top: offsetTop - 10
        })
      }
    } catch (e) {}
  }
}
