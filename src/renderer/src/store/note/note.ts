import { IDoc, ISpace } from 'types/model'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Store } from '../store'
import { EditorUtils } from '@/editor/utils/editorUtils'
import { History } from 'slate-history'
import { nanoid } from 'nanoid'
import { TabStore } from './tab'
import { BaseSelection, Path } from 'slate'
export class NoteStore {
  docStatus = new Map<string, { history: History | null; sel: BaseSelection | null }>()
  tabStoreMap = new Map<string, TabStore>()
  recordTimer = 0
  useState = create(
    immer(() => ({
      view: 'folder' as 'folder' | 'search',
      nodes: {} as Record<string, IDoc>,
      spaces: [] as ISpace[],
      initialized: false,
      foldStars: false,
      ctxNodeId: null as null | string,
      dragDocId: null as null | string,
      tabs: [] as string[],
      tabIndex: 0,
      selectedDocId: null as null | string,
      searchKeyWord: '',
      selectedSpaceId: null as null | string,
      dragStatus: null as null | {
        mode: 'enter' | 'top' | 'bottom'
        dropNodeId: string
      }
    }))
  )
  get currentTab() {
    const state = this.useState.getState()
    return state.tabs[state.tabIndex]
  }
  get currentTabStore() {
    const state = this.useState.getState()
    return this.tabStoreMap.get(state.tabs[state.tabIndex])!
  }
  get currentSpace() {
    const state = this.useState.getState()
    return state.spaces.find((space) => space.id === state.selectedSpaceId)
  }
  useSpace() {
    return this.useState((state) => state.spaces.find((s) => s.id === state.selectedSpaceId))
  }
  constructor(private readonly store: Store) {
    this.init()
  }
  init() {
    this.store.model.getSpaces().then((spaces) => {
      console.log('space', spaces)
      this.useState.setState((state) => {
        const lastOpenSpaceId = localStorage.getItem('lastOpenSpaceId')
        state.spaces = spaces
        state.selectedSpaceId =
          lastOpenSpaceId && spaces.find((space) => space.id === lastOpenSpaceId)
            ? lastOpenSpaceId
            : spaces[0]?.id || null
        if (state.selectedSpaceId) {
          this.getDocs(state.selectedSpaceId)
        }
      })
    })
  }
  selectSpace(spaceId: string) {
    this.docStatus.clear()
    this.tabStoreMap.clear()
    this.useState.setState((state) => {
      state.selectedSpaceId = spaceId
    })
    this.getDocs(spaceId)
  }
  createTab(docId?: string) {
    this.useState.setState((state) => {
      const id = nanoid()
      state.tabs.push(id)
      const store = new TabStore(this.store)
      if (docId) {
        store.useState.setState((state) => {
          state.docIds.push(docId)
          state.currentIndex = 0
        })
      }
      this.tabStoreMap.set(id, store)
    })
  }
  removeTab(i: number) {
    const { tabs } = this.useState.getState()
    if (tabs.length < 2) return
    this.useState.setState((state) => {
      state.tabs.splice(i, 1)
      if (i > 0) {
        state.tabIndex--
      }
    })
    this.tabStoreMap.delete(tabs[i])
    // this.recordTabs()
  }
  getDocs(spaceId: string) {
    this.store.model.getDocs(spaceId).then((docs) => {
      const nodes: Record<string, IDoc> = {}
      const foldersMap = new Map<string, string[]>()
      for (const doc of docs) {
        if (doc.folder) {
          nodes[doc.id] = {
            ...doc,
            children: []
          }
        } else {
          const parent = doc.parentId || 'root'
          if (!foldersMap.has(parent)) {
            foldersMap.set(parent, [])
          }
          foldersMap.get(parent)?.push(doc.id)
          nodes[doc.id] = {
            ...doc,
            schema: doc.schema ? JSON.parse(doc.schema as unknown as string) : EditorUtils.p,
            links: doc.links ? JSON.parse(doc.links as unknown as string) : []
          }
        }
      }
      const now = Date.now()
      nodes['root'] = {
        id: 'root',
        name: 'root',
        children: foldersMap.get('root') || [],
        created: now,
        updated: now,
        spaceId,
        folder: true,
        sort: 0
      }
      for (const [id, children] of foldersMap.entries()) {
        if (id === 'root') continue
        if (nodes[id]) {
          nodes[id].children = children
        }
      }
      this.useState.setState((state) => {
        state.nodes = nodes
      })
    })
  }
  checkOtherTabsShouldUpdate() {
    const { tabs, tabIndex } = this.useState.getState()
    const currentTab = this.currentTabStore
    const doc = currentTab.doc
    if (tabs.length > 1 && doc) {
      tabs.forEach((t, i) => {
        if (i !== tabIndex && this.tabStoreMap.get(t)?.doc.id === doc.id) {
          this.tabStoreMap.get(t)?.externalChange$.next(null)
        }
      })
    }
  }
  selectTab(i: number) {
    const currentTab = this.currentTabStore
    currentTab.saveDoc$.next(null)
    this.checkOtherTabsShouldUpdate()
    this.useState.setState((state) => {
      state.tabIndex = i
      state.selectedDocId = null
    })
    setTimeout(() => {
      const currentTab = this.currentTabStore
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
      const { tabs, tabIndex, selectedSpaceId } = this.useState.getState()
      await this.store.model.putSetting({
        key: `tab-${selectedSpaceId}`,
        value: {
          tabs,
          tabIndex
        }
      })
    }, 300)
  }
  openDoc(doc: IDoc, scroll: boolean = false) {
    const tab = this.currentTabStore
    const state = this.useState.getState()
    const index = state.tabs.findIndex((t) => t === doc.id)
    if (index !== -1) {
      if (index === state.tabIndex) return
      return this.selectTab(index)
    }
    const tabState = tab.useState.getState()
    const history = tabState.docIds.filter((t) => t !== doc.id)
    tabState.docIds.push(doc.id)
    tab.useState.setState((state) => {
      state.docIds = history
      state.currentIndex = history.length - 1
      state.domRect = null
    })
    const now = Date.now()
    this.store.model.updateDoc(doc.id, {
      lastOpenTime: now
    })
    this.recordTabs()
    if (scroll) {
      tab.container?.scroll({
        top: 0,
        behavior: 'auto'
      })
    }
  }
  findFirstChildNote(doc: IDoc) {
    if (!doc.folder) {
      return doc
    }
    const { nodes } = this.useState.getState()
    const stack = doc.children?.slice().map((id) => nodes[id]) || []
    let note: IDoc | undefined = undefined
    while (stack.length) {
      const item = stack.shift()!
      if (!item.folder) {
        note = item
        break
      } else if (item.children?.length) {
        stack.unshift(...item.children.map((id) => nodes[id]))
      }
    }
    return note
  }
}
