import {useEffect} from 'react'
import {MainApi} from '../api/main'
import {db} from '../store/db'
import {runInAction} from 'mobx'
import { useCoreContext } from '../store/core'

export const useSystemMenus = () => {
  const core = useCoreContext()
  useEffect(() => {
    const newTab = () => {
      core.tree.appendTab()
    }
    const closeCurrentTab = () => {
      if (core.tree.tabs.length > 1) {
        core.tree.removeTab(core.tree.currentIndex)
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
      if (core.tree.root?.cid === data.space) {
        const file = await db.file.where('filePath').equals(data.path).first()
        if (file && core.tree.nodeMap.get(file.cid)) {
          core.tree.openNote(core.tree.nodeMap.get(file.cid)!)
        }
      }
      if (!core.tree.root) {
        await core.tree.initial(space.cid)
        const file = await db.file.where('filePath').equals(data.path).first()
        if (file && core.tree.nodeMap.get(file.cid)) {
          core.tree.appendTab(core.tree.nodeMap.get(file.cid))
        }
      }
      runInAction(() => {
        core.tree.selectItem = null
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
