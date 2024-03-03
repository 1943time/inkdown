import {useCallback, useEffect} from 'react'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'
import {base64ToArrayBuffer, message$, modal$, stat, toArrayBuffer} from '../utils'
import {db} from '../store/db'
import {runInAction} from 'mobx'
import {basename, isAbsolute, join} from 'path'
import {existsSync, readFileSync} from 'fs'
import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {configStore} from '../store/config'
import {IFileItem} from '../index'
import ky from 'ky'

const urlRegexp = /\[([^\]\n]*)]\(([^)\n]+)\)/g

export const useSystemMenus = () => {
  const initial = useCallback(async () => {
    // window.electron.ipcRenderer.invoke('get-win-set').then(async res => {
    //   if (res) {
    //     let {openTabs, openFolder, index} = res as {openTabs: string[], openFolder: string, index: number}
    //     openTabs = openTabs ? Array.from(new Set(openTabs.filter(t => !!t) )): []
    //     if (openTabs?.length === 1 && !openFolder) {
    //       try {
    //         readFileSync(openTabs[0])
    //       } catch (e) {
    //         await MainApi.open(openTabs[0])
    //       }
    //     }
    //     try {
    //       const s = stat(openFolder)
    //       if (openFolder && s && s.isDirectory()) {
    //         treeStore.openFolder(openFolder)
    //       }
    //       if (!openTabs?.length) {
    //         openTabs = treeStore.firstNote ? [treeStore.firstNote.filePath] : []
    //       }
    //       if (openTabs.length) {
    //         // treeStore.restoreTabs(openTabs)
    //       }
    //       if (typeof index === 'number' && treeStore.tabs[index]) {
    //         treeStore.selectTab(index)
    //       }
    //       if (treeStore.currentTab?.current) {
    //         if (treeStore.root) {
    //           document.title = `${treeStore.root}-${treeStore.currentTab.current.filename}`
    //         } else {
    //           document.title = `${treeStore.currentTab.current.filename}`
    //         }
    //       }
    //     } catch (e) {}
    //   }
    // })
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
              // treeStore.openNote(filePath)
            }
          }
          window.electron.ipcRenderer.send('add-recent-path', res.filePaths[0])
        }
      })
    }
    const openFile = (e: any) => {
      MainApi.openFile().then(res => {
        if (res.filePaths.length) {
          // treeStore.openNote(res.filePaths[0])
          // window.electron.ipcRenderer.send('add-recent-path', res.filePaths[0])
        }
      })
    }
    const printPdf = () => {
      MainApi.sendToSelf('window-blur')
      if (treeStore.openedNote && treeStore.openedNote.ext === 'md') {
        window.electron.ipcRenderer.send('print-pdf', treeStore.openedNote!.filePath, treeStore.root?.filePath)
      }
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
      if ( treeStore.tabs.length > 1 ) {
        treeStore.removeTab(treeStore.currentIndex)
      } else {
        MainApi.closeWindow()
      }
    }


    initial()

    window.electron.ipcRenderer.on('open', open)
    window.electron.ipcRenderer.on('new-tab', newTab)
    window.electron.ipcRenderer.on('close-other-tabs', closeOtherTabs)
    window.electron.ipcRenderer.on('close-selected-tab', closeSelectedTab)
    window.electron.ipcRenderer.on('close-current-tab', closeCurrentTab)
    window.electron.ipcRenderer.on('open-file', openFile)
    // window.electron.ipcRenderer.on('create', create)
    window.electron.ipcRenderer.on('call-print-pdf', printPdf)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('close-other-tabs', closeOtherTabs)
      window.electron.ipcRenderer.removeListener('new-tab', newTab)
      window.electron.ipcRenderer.removeListener('close-current-tab', closeCurrentTab)
      window.electron.ipcRenderer.removeListener('close-selected-tab', closeSelectedTab)
      window.electron.ipcRenderer.removeListener('open-file', openFile)
      // window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('call-print-pdf', printPdf)
    }
  }, [])
}
