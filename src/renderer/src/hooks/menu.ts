import {useEffect} from 'react'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'
import {db} from '../store/db'
import {runInAction} from 'mobx'

export const useSystemMenus = () => {
  useEffect(() => {
    const newTab = () => {
      treeStore.appendTab()
    }
    const closeCurrentTab = () => {
      if (treeStore.tabs.length > 1) {
        treeStore.removeTab(treeStore.currentIndex)
      } else {
        MainApi.closeWindow()
      }
    }
    const openProtocol = async (e: any, data: {
      space: string
      path: string
      hash?: string
    }) => {
      const space = await db.space.get(data.space)
      if (!space) return
      if (treeStore.root?.cid === data.space) {
        const file = await db.file.where('filePath').equals(data.path).first()
        if (file && treeStore.nodeMap.get(file.cid)) {
          treeStore.openNote(treeStore.nodeMap.get(file.cid)!)
        }
      }
      if (!treeStore.root) {
        await treeStore.initial(space.cid)
        const file = await db.file.where('filePath').equals(data.path).first()
        if (file && treeStore.nodeMap.get(file.cid)) {
          treeStore.appendTab(treeStore.nodeMap.get(file.cid))
        }
      }
      runInAction(() => {
        treeStore.selectItem = null
      })
    }
    window.electron.ipcRenderer.on('new-tab', newTab)
    window.electron.ipcRenderer.on('close-current-tab', closeCurrentTab)
    window.electron.ipcRenderer.on('open-protocol', openProtocol)
    return () => {
      window.electron.ipcRenderer.removeListener('new-tab', newTab)
      window.electron.ipcRenderer.removeListener('close-current-tab', closeCurrentTab)
      window.electron.ipcRenderer.removeListener('open-protocol', openProtocol)
    }
  }, [])
}
