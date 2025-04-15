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
      selectedSpaceId: null as null | string
    }))
  )
  get currentTab() {
    const state = this.useState.getState()
    return state.tabs[state.tabIndex]
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
