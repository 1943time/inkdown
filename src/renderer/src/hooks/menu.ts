import {useEffect} from 'react'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'

export const useSystemMenus = () => {
  useEffect(() => {
    const newTab = () => {
      treeStore.appendTab()
    }

    const closeCurrentTab = () => {
      if ( treeStore.tabs.length > 1 ) {
        treeStore.removeTab(treeStore.currentIndex)
      } else {
        MainApi.closeWindow()
      }
    }
    window.electron.ipcRenderer.on('new-tab', newTab)
    window.electron.ipcRenderer.on('close-current-tab', closeCurrentTab)
    return () => {
      window.electron.ipcRenderer.removeListener('new-tab', newTab)
      window.electron.ipcRenderer.removeListener('close-current-tab', closeCurrentTab)
    }
  }, [])
}
