import {useCallback, useEffect} from 'react'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'
import {stat} from '../utils'
import {exportHtml} from '../editor/output/html'
import {clearExpiredRecord, db} from '../store/db'
import {runInAction} from 'mobx'

export const useSystemMenus = () => {
  const initial = useCallback(async () => {
    window.electron.ipcRenderer.invoke('get-win-set').then(res => {
      if (res) {
        let {openTabs, openFolder, index} = res as {openTabs: string[], openFolder: string, index: number}
        openTabs = openTabs ? openTabs.filter(t => !!t) : []
        try {
          const s = stat(openFolder)
          if (openFolder && s && s.isDirectory()) {
            treeStore.openFolder(openFolder)
          }
          if (!openTabs?.length) {
            openTabs = treeStore.firstNote ? [treeStore.firstNote.filePath] : []
          }
          if (openTabs.length) {
            treeStore.restoreTabs(openTabs)
          }
          if (typeof index === 'number' && treeStore.tabs[index]) {
            treeStore.selectTab(index)
          }
        } catch (e) {}
      }
    })
  }, [])

  useEffect(() => {
    const open = (e: any) => {
      MainApi.open(treeStore.root?.filePath).then(res => {
        if (res.filePaths.length) {
          const filePath = res.filePaths[0]
          const s = stat(filePath)
          if (s) {
            if (s.isDirectory()) {
              treeStore.openFolder(filePath)
              treeStore.openFirst()
            } else {
              treeStore.openNote(filePath)
            }
          }
          window.electron.ipcRenderer.send('add-recent-path', res.filePaths[0])
        }
      })
    }
    const openFile = (e: any) => {
      MainApi.openFile().then(res => {
        if (res.filePaths.length) {
          treeStore.openNote(res.filePaths[0])
          window.electron.ipcRenderer.send('add-recent-path', res.filePaths[0])
        }
      })
    }

    const create = (e: any) => {
      MainApi.createNewFile({
        defaultPath: treeStore.root?.filePath
      }).then(res => {
        if (res.filePath) {
          treeStore.openNote(res.filePath)
        }
      })
    }
    const printPdf = () => {
      MainApi.sendToSelf('window-blur')
      if (treeStore.openedNote && treeStore.openedNote.ext === 'md') {
        window.electron.ipcRenderer.send('print-pdf', treeStore.openedNote!.filePath, treeStore.root?.filePath)
      }
    }
    const printHtml = () => {
      MainApi.sendToSelf('window-blur')
      if (treeStore.openedNote && treeStore.openedNote.ext === 'md') exportHtml(treeStore.openedNote)
    }
    const clearRecent = () => {
      db.recent.clear()
    }
    const newTab = () => {
      treeStore.appendTab()
    }
    const closeOtherTabs = () => {
      if (treeStore.tabs.length > 1) {
        runInAction(() => {
          const saveTab = treeStore.tabs[treeStore.tabContextIndex]
          treeStore.tabs = [saveTab]
          treeStore.currentIndex = 0
        })
      }
    }
    const closeSelectedTab = () => {
      if (treeStore.tabs.length > 1) {
        treeStore.removeTab(treeStore.tabContextIndex)
      }
    }

    const closeCurrentTab = () => {
      if (treeStore.tabs.length > 1) {
        treeStore.removeTab(treeStore.currentIndex)
      }
    }

    initial()
    setTimeout(() => {
      clearExpiredRecord()
    }, 10000)
    window.electron.ipcRenderer.on('open', open)
    window.electron.ipcRenderer.on('new-tab', newTab)
    window.electron.ipcRenderer.on('close-other-tabs', closeOtherTabs)
    window.electron.ipcRenderer.on('close-selected-tab', closeSelectedTab)
    window.electron.ipcRenderer.on('close-current-tab', closeCurrentTab)
    window.electron.ipcRenderer.on('open-file', openFile)
    window.electron.ipcRenderer.on('create', create)
    window.electron.ipcRenderer.on('call-print-pdf', printPdf)
    window.electron.ipcRenderer.on('call-print-html', printHtml)
    window.electron.ipcRenderer.on('clear-recent', clearRecent)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('close-other-tabs', closeOtherTabs)
      window.electron.ipcRenderer.removeListener('new-tab', newTab)
      window.electron.ipcRenderer.removeListener('close-current-tab', closeCurrentTab)
      window.electron.ipcRenderer.removeListener('close-selected-tab', closeSelectedTab)
      window.electron.ipcRenderer.removeListener('open-file', openFile)
      window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('call-print-pdf', printPdf)
      window.electron.ipcRenderer.removeListener('call-print-html', printHtml)
      window.electron.ipcRenderer.removeListener('clear-recent', clearRecent)
    }
  }, [])
}
