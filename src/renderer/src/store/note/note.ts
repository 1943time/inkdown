import { IDoc, ISpace } from 'types/model'
import { Store } from '../store'
import { History } from 'slate-history'
import { TabStore } from './tab'
import { BaseSelection, Editor, Range, Transforms } from 'slate'
import { Subject } from 'rxjs'
import { ReactNode } from 'react'
import { StructStore } from '../struct'
import { observable } from 'mobx'
import isHotkey from 'is-hotkey'
import { ReactEditor } from 'slate-react'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { slugify } from '@/editor/utils/dom'
import { Refactor } from './refactor'
import { delayRun } from '@/utils/common'
import { MediaNode } from '@/editor'
import { getImageData } from '@/editor/utils'
import i18next from 'i18next'

const state = {
  view: 'folder' as 'folder' | 'search',
  nodes: {} as Record<string, IDoc>,
  spaces: [] as ISpace[],
  initialized: false,
  foldStars: false,
  ctxNode: null as null | IDoc,
  dragNode: null as null | IDoc,
  tabs: [] as TabStore[],
  // 空间已被删除
  deleted: false,
  tabIndex: 0,
  showQuickOpen: false,
  selectedDoc: null as null | IDoc,
  selectedSpaceId: null as null | string,
  selectedSpace: null as null | ISpace,
  openExportSpace: false,
  openSpaceFiles: false,
  openHistory: false,
  previewImage: {
    open: false,
    index: 0,
    images: [] as { src: string }[]
  },
  dragStatus: null as null | {
    mode: 'enter' | 'top' | 'bottom'
    dropNode: null | IDoc
  },
  get currentTab() {
    return this.tabs[this.tabIndex]
  },
  get currentSpace() {
    return this.spaces.find((space) => space.id === this.selectedSpaceId)
  },
  get opendDoc() {
    return this.currentTab?.state.doc
  },
  get root() {
    return this.nodes['root']
  }
}

export class NoteStore extends StructStore<typeof state> {
  refactor: Refactor
  docStatus = new Map<string, { history: History | null; sel: BaseSelection | null }>()
  recordTimer = 0
  openEditFolderDialog$ = new Subject<{
    ctxNode?: IDoc
    mode: 'create' | 'update'
  }>()
  openEditSpace$ = new Subject<string | null>()
  openSpaceExport$ = new Subject()
  openImportFolder$ = new Subject<string | null>()
  externalChange$ = new Subject<string>()
  refreshNav$ = new Subject()
  updateDoc$ = new Subject<{ id: string; schema: any[]; ipc: boolean }>()
  openConfirmDialog$ = new Subject<{
    onClose?: () => void
    title: string
    okText?: string
    okType?: 'danger' | 'primary'
    cancelText?: string
    hideCancelButton?: boolean
    allowClose?: false
    width?: number
    description?: ReactNode
    onCancel?: () => void
    onConfirm?: () => void | Promise<any>
    footer?: ReactNode
  }>()
  deleteDialog(item: IDoc) {
    this.openConfirmDialog$.next({
      title: i18next.t('note.confirmDelete', {
        type: item.folder ? i18next.t('note.folder') : i18next.t('note.file'),
        name: item.name
      }),
      description: i18next.t('note.restoreFromTrash'),
      onConfirm: async () => {
        this.moveToTrash(item, false)
      },
      okText: i18next.t('note.moveToTrash')
    })
  }
  constructor(private readonly store: Store) {
    super(
      observable(state, {
        tabs: observable.shallow
      })
    )
    this.refactor = new Refactor(this.store)
    window.addEventListener('keydown', (e) => {
      if (this.store.settings.state.fullChatBot) return
      const editor = this.state.currentTab.editor
      if (isHotkey('mod+c', e) && this.state.opendDoc) {
        const [node] = Editor.nodes(editor, {
          match: (n) => n.type === 'media'
        })
        if (node) {
          if (node[0].id) {
            window.api.writeImageToClipboard(
              window.api.path.join(this.store.userDataPath, 'assets', node[0].id)
            )
            // window.api.writeToClipboard(
            //   `media://file?id=${node[0].id || ''}&height=${node[0].height || ''}&url=${node[0].url || ''}`
            // )
          }
        }
      }
      if (isHotkey('backspace', e) && !ReactEditor.isFocused(editor)) {
        const [node] = Editor.nodes(editor, {
          match: (n) => n.type === 'media'
        })
        if (node && Range.isCollapsed(editor.selection!)) {
          Transforms.removeNodes(editor, { at: node[1] })
          Transforms.insertNodes(editor, EditorUtils.p, {
            at: node[1],
            select: true
          })
          ReactEditor.focus(editor)
        }
      }
    })
  }
  init(spaceId?: string) {
    this.store.model.getSpaces().then((spaces) => {
      this.setState((state) => {
        state.tabs = []
        const lastOpenSpaceId = localStorage.getItem('lastOpenSpaceId')
        state.spaces = spaces
        state.selectedSpaceId =
          spaceId || (lastOpenSpaceId && spaces.find((space) => space.id === lastOpenSpaceId))
            ? lastOpenSpaceId
            : spaces[0]?.id || null
        if (spaceId) {
          localStorage.setItem('lastOpenSpaceId', spaceId)
        }
        if (state.selectedSpaceId) {
          this.getDocs(state.selectedSpaceId)
        }
      })
    })
  }
  selectSpace(spaceId?: string) {
    if (spaceId === this.state.selectedSpaceId) return
    this.docStatus.clear()
    this.setState((state) => {
      state.tabs = []
      if (spaceId) {
        state.selectedSpaceId = spaceId!
      } else {
        spaceId = this.state.spaces[0]!.id
        state.selectedSpaceId = spaceId!
      }
      this.getDocs(spaceId)
    })
    if (spaceId) {
      this.store.model.updateSpace(spaceId, {
        lastOpenTime: Date.now()
      })
      localStorage.setItem('lastOpenSpaceId', spaceId)
    }
  }
  createTab(doc?: IDoc) {
    const index = this.state.tabs.findIndex((t) => t.state.doc?.id === doc?.id)
    if (index !== -1) {
      this.selectTab(index)
      return
    }
    this.setState((state) => {
      const store = new TabStore(this.store)
      state.tabs.push(store)
      if (doc) {
        store.setState((state) => {
          state.docs.push(doc)
          state.currentIndex = 0
        })
      }
      state.tabIndex = state.tabs.length - 1
    })
    this.recordTabs()
  }
  removeTab(i: number) {
    if (this.state.tabs.length < 2) return
    this.state.currentTab.saveDoc$.next(null)
    this.setState((state) => {
      state.tabs.splice(i, 1)
      if (i === state.tabIndex) {
        if (!state.tabs[state.tabIndex]) {
          state.tabIndex--
        }
      } else if (i < state.tabIndex) {
        state.tabIndex--
      }
    })
    this.recordTabs()
  }
  getDocs(spaceId: string) {
    this.store.model.getDocs(spaceId).then((docs) => {
      const nodes: Record<string, IDoc> = {}
      const foldersMap = new Map<string, IDoc[]>()
      for (const doc of docs) {
        if (doc.folder) {
          nodes[doc.id] = observable({
            ...doc,
            children: []
          })
        } else {
          nodes[doc.id] = observable(
            {
              ...doc,
              schema: undefined
            },
            {
              schema: false
            }
          )
        }
        const parent = doc.parentId
        if (!foldersMap.has(parent)) {
          foldersMap.set(parent, [])
        }
        foldersMap.get(parent)?.push(nodes[doc.id])
      }
      const now = Date.now()
      nodes['root'] = observable({
        id: 'root',
        name: 'root',
        children: foldersMap.get('root') || [],
        created: now,
        updated: now,
        spaceId,
        parentId: '',
        folder: true,
        sort: 0
      })
      for (const [id, children] of foldersMap.entries()) {
        if (id === 'root') continue
        if (nodes[id]) {
          nodes[id].children = children
        }
      }
      this.setState((state) => {
        state.nodes = nodes
      })
      this.restoreTabs()
      delayRun(() => {
        this.store.local.initialRewrite(this.state.nodes)
      })
    })
  }
  checkOtherTabsShouldUpdate() {
    const { tabs, tabIndex, currentTab } = this.state
    const doc = currentTab.state.doc
    if (tabs.length > 1 && doc) {
      tabs.forEach((t, i) => {
        if (i !== tabIndex && t.state.doc?.id === doc.id) {
          this.externalChange$.next(t.state.doc.id)
        }
      })
    }
  }
  selectTab(i: number) {
    this.state.currentTab.saveDoc$.next(null)
    this.checkOtherTabsShouldUpdate()
    this.setState((state) => {
      state.tabIndex = i
      state.selectedDoc = null
    })
    setTimeout(() => {
      const currentTab = this.state.currentTab
      const backRange = currentTab.range
      if (backRange) {
        const selection = window.getSelection()!
        selection.removeAllRanges()
        selection.addRange(backRange)
      }
    })
    this.recordTabs()
  }
  async recordTabs() {
    clearTimeout(this.recordTimer)
    this.recordTimer = window.setTimeout(async () => {
      const { tabs, tabIndex, selectedSpaceId } = this.state
      await this.store.model.putSetting({
        key: `tab-${selectedSpaceId}`,
        value: {
          tabs: tabs.map((t) => t.state.doc?.id).filter((id) => !!id),
          tabIndex
        }
      })
    }, 300)
  }
  async restoreTabs() {
    const record = await this.store.model.getSetting(`tab-${this.state.selectedSpaceId}`)
    if (record && record.value.tabs.length) {
      record.value.tabIndex = record.value.tabIndex < 0 ? 0 : record.value.tabIndex
      this.setState((state) => {
        state.tabs = record.value.tabs.map((id) => {
          const tab = new TabStore(this.store)
          if (this.state.nodes[id]) {
            tab.setState((state) => {
              state.docs.push(this.state.nodes[id])
              state.currentIndex = state.docs.length - 1
            })
          }
          return tab
        })
        state.tabIndex = record.value.tabIndex > state.tabs.length - 1 ? 0 : record.value.tabIndex
      })
    } else {
      const doc = this.findFirstChildNote(this.state.root)
      const tab = new TabStore(this.store)
      if (doc) {
        tab.setState((state) => {
          state.docs.push(doc)
          state.currentIndex = 0
        })
      }
      this.setState((state) => {
        state.tabs.push(tab)
        state.tabIndex = 0
      })
    }
    for (const tab of this.state.tabs) {
      if (tab.state.doc) {
        this.openParents(tab.state.doc)
      }
    }
  }
  openParents(doc: IDoc) {
    this.setState((state) => {
      let parent = state.nodes[doc.parentId]
      while (parent) {
        parent.expand = true
        parent = state.nodes[parent.parentId]
      }
    })
  }
  openDoc(
    doc: IDoc,
    opt?: {
      scroll?: boolean
      newTab?: boolean
    }
  ) {
    if (this.state.opendDoc?.id === doc.id) return
    if (!this.state.nodes[doc.id]) return
    const tab = this.state.currentTab
    const index = this.state.tabs.findIndex((t) => t.state.doc?.id === doc.id)
    if (index !== -1) {
      if (index === this.state.tabIndex) return
      return this.selectTab(index)
    }
    if (opt?.newTab) {
      this.createTab(doc)
    } else {
      tab.setState((state) => {
        state.docs = state.docs.filter((t) => t.id !== doc.id)
        state.docs.push(doc)
        state.currentIndex = state.docs.length - 1
        state.domRect = null
      })
      const now = Date.now()
      this.store.model.updateDoc(doc.id, {
        lastOpenTime: now
      })
      this.recordTabs()
      this.openParents(doc)
      if (opt?.scroll) {
        tab.container?.scroll({
          top: 0,
          behavior: 'auto'
        })
      }
    }
  }
  findFirstChildNote(doc: IDoc) {
    if (!doc.folder) {
      return doc
    }
    const stack = doc.children?.slice() || []
    let note: IDoc | undefined = undefined
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
  moveToTrash(item: IDoc, ipc = false) {
    this.setState((state) => {
      state.selectedDoc = null
    })
    this.removeSelf(item)
    if (!ipc) {
      // this.store.ipc.sendMessage({
      //   type: 'deleteNode',
      //   data: { cid: item.id }
      // })
    }
  }
  navigatePrev() {
    if (this.state.currentTab?.state.hasPrev) {
      this.state.currentTab.setState((state) => {
        state.currentIndex--
      })
    }
  }

  navigateNext() {
    if (this.state.currentTab?.state.hasNext) {
      this.state.currentTab.setState((state) => {
        state.currentIndex++
      })
    }
  }
  async moveNode(ipc = false) {
    const { dragNode: dragDoc, dragStatus, ctxNode, nodes } = this.state
    if (!dragStatus) return
    if (
      !dragDoc ||
      !dragStatus?.dropNode ||
      dragStatus.dropNode === dragDoc ||
      (dragStatus.dropNode.id === dragDoc.parentId && dragStatus.mode === 'enter')
    ) {
      this.setState((state) => {
        state.dragNode = null
        state.dragStatus = null
      })
    } else {
      const oldPath = this.getDocPath(dragDoc).join('/')
      let changed = false
      this.setState((draft) => {
        const { dropNode, mode } = draft.dragStatus!
        const dragNode = draft.dragNode!
        let targetList = draft.nodes[dropNode!.parentId].children!
        const oldList = draft.nodes[dragNode.parentId].children!
        let index = targetList.findIndex((l) => l === dropNode)
        draft.dragNode = null
        draft.dragStatus = null
        if (
          ((mode === 'bottom' || mode === 'top') &&
            dragNode.parentId !== dropNode?.parentId &&
            targetList.find((c) => c.name === dragNode.name)) ||
          (mode === 'enter' && dropNode!.children?.find((c) => c.name === dragNode.name))
        ) {
          this.store.msg.info(i18next.t('note.fileExistsInTarget'))
          return
        }
        if (mode === 'top' && targetList[index - 1] === dragNode) return
        if (mode === 'bottom' && targetList[index + 1] === dragNode) return
        draft.nodes[dragNode.parentId].children = oldList.filter((c) => c.id !== dragNode.id)
        if (dragNode.parentId === dropNode?.parentId) {
          targetList = targetList.filter((c) => c.id !== dragNode.id)
          index = targetList.findIndex((l) => l.id === dropNode!.id)
        }
        const updated = Date.now()
        if (mode === 'bottom' || mode === 'top') {
          targetList.splice(mode === 'top' ? index : index + 1, 0, dragNode)
          draft.nodes[dropNode!.parentId].children = targetList
          if (dragNode.parentId !== dropNode?.parentId) {
            draft.nodes[dragNode.parentId].children = oldList.filter((c) => c.id !== dragNode.id)
            if (!ipc) {
              this.store.model.updateDoc(dragNode.id, {
                parentId: dropNode?.parentId
              })
              changed = true
              dragNode.parentId = dropNode!.parentId
              this.store.model.updateDocs(
                targetList.map((n, i) => ({ id: n.id, sort: i, updated }))
              )
            }
          } else if (!ipc) {
            const updated = Date.now()
            this.store.model.updateDocs(targetList.map((n, i) => ({ id: n.id, sort: i, updated })))
          }
        }
        if (mode === 'enter' && dropNode!.folder) {
          dropNode!.children!.unshift(dragNode)
          dropNode!.expand = true
          draft.nodes[dragNode.parentId].children = oldList.filter((c) => c.id !== dragNode.id)
          if (!ipc) {
            changed = true
            this.store.model.updateDoc(dragNode.id, {
              parentId: dropNode!.id
            })
            dragNode.parentId = dropNode!.id
            this.store.model.updateDocs(
              dropNode!.children!.map((n, i) => ({ id: n.id, sort: i, updated }))
            )
          }
        }

        if (changed) {
          this.refactor.refactor(dragNode, oldPath)
          this.store.local.localRename(oldPath, dragNode)
          this.refreshNav$.next(null)
        }
        if (!ipc) {
          // this.core.ipc.sendMessage({
          //   type: 'moveNode',
          //   data: {
          //     dragNode: dragNode.cid,
          //     dropNode: dropNode.cid,
          //     mode: mode,
          //     spaceCid: this.root.cid
          //   }
          // })
        }
      })
    }
  }
  private removeSelf(node: IDoc) {
    if (!node.folder) this.removeNodeFromHistory(node)
    const parentId = node.parentId
    const deletedIds: string[] = [node.id]
    this.setState((state) => {
      state.nodes[parentId].children = state.nodes[parentId].children!.filter(
        (c) => c.id !== node.id
      )
      delete state.nodes[node.id]
    })
    if (node.folder) {
      const stack = node.children!.slice()
      while (stack.length) {
        const item = stack.pop()!
        if (item.folder) {
          stack.push(...item.children!)
        } else {
          this.removeNodeFromHistory(item)
        }
        deletedIds.push(item.id)
      }
      this.setState((state) => {
        for (const id of deletedIds) {
          delete state.nodes[id]
        }
      })
    }
    this.store.model.updateDocs(deletedIds.map((id) => ({ id, deleted: true })))
  }
  private removeNodeFromHistory(doc: IDoc) {
    const { tabs } = this.state
    for (let t of tabs) {
      if (!t.state?.doc) continue
      if (t.state.doc.id === doc.id) {
        t.editor.selection = null
      }
      if (t.state.docs.length) {
        t.setState((state) => {
          state.docs = state.docs.filter((d) => d.id !== doc.id)
          if (state.docs.length > 0 && state.currentIndex > state.docs.length - 1) {
            state.currentIndex = state.docs.length - 1
          } else if (!state.docs.length) {
            state.currentIndex = 0
          }
        })
      }
    }
  }
  getDocPath(doc: IDoc) {
    const path: string[] = []
    let current = doc
    while (current) {
      if (current.id === 'root') break
      path.unshift(current.name)
      current = this.state.nodes[current.parentId]
    }
    return path
  }

  deepCreateFolder(path: string[]) {
    const docMap = new Map<string, IDoc>(
      Object.values(this.state.nodes).map((node) => [this.getDocPath(node).join('/'), node])
    )
    let curNode = this.state.nodes['root']
    let curPath = ''
    for (const p of path) {
      curPath = curPath ? `${curPath}/${p}` : p
      if (docMap.has(curPath)) {
        const node = docMap.get(curPath)!
        if (node.folder) {
          curNode = node
          continue
        }
      }
      const data = this.store.menu.createFolder(p, curNode.id)
      curNode = data
    }
    return curNode
  }
  getWikiDoc(docName: string) {
    if (!docName) return this.state.opendDoc
    const parent = this.state.nodes[this.state.opendDoc?.parentId].children || []
    for (let doc of parent) {
      if (!doc.folder) {
        if (doc.name === docName) {
          return doc
        }
      }
    }
    for (let doc of Object.values(this.state.nodes)) {
      if (!doc.folder) {
        if (docName.includes('/')) {
          const path = this.getDocPath(doc)
          if (path.join('/') === docName) {
            return doc
          }
        } else {
          if (doc.name === docName) {
            return doc
          }
        }
      }
    }
  }
  toWikiLink(str: string, newTab = false) {
    if (!str) return
    const match = EditorUtils.parseWikiLink(str)
    if (!match) return str
    const { docName, anchor } = match
    let exist = false
    if (docName) {
      const doc = this.getWikiDoc(docName)
      if (doc) {
        this.openDoc(doc, { newTab, scroll: true })
        exist = true
      }
    } else if (anchor) {
      const doc = this.state.currentTab.state.doc
      if (doc) {
        const id = slugify(anchor)
        const el = this.state.currentTab.container?.querySelector(
          `[data-head="${id}"]`
        ) as HTMLElement
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }
      exist = true
    }

    if (!exist) {
      let parentNode = this.state.nodes[this.state.opendDoc.parentId]
      if (docName.includes('/')) {
        parentNode = this.deepCreateFolder(docName.split('/').slice(0, -1))
      }
      const name = docName.split('/').pop()!
      this.store.menu.createDoc(parentNode.id, name)
    } else if (docName && anchor) {
      setTimeout(() => {
        const id = slugify(anchor)
        const el = this.state.currentTab.container?.querySelector(
          `[data-head="${id}"]`
        ) as HTMLElement
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    }
  }
  async openPreviewImages(el: MediaNode) {
    if (!this.state.currentTab) return
    const nodes = Array.from(
      Editor.nodes<MediaNode>(this.state.currentTab.editor, {
        at: [],
        match: (n) => n.type === 'media' && n.mediaType === 'image'
      })
    )
    let index = nodes.findIndex((n) => n[0] === el)
    if (index < 0) {
      index = 0
    }
    if (nodes.length) {
      const urls: { src: string }[] = []
      for (const n of nodes) {
        if (n[0].id) {
          urls.push({ src: getImageData(await this.store.system.getFilePath(n[0].id)) })
        } else {
          urls.push({ src: n[0].url! })
        }
      }
      this.setState((state) => {
        state.previewImage.open = true
        state.previewImage.index = index
        state.previewImage.images = urls
      })
    }
  }
}
