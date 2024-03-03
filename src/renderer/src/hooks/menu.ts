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
    window.electron.ipcRenderer.invoke('get-win-set').then(async res => {
      if (res) {
        let {openTabs, openFolder, index} = res as {openTabs: string[], openFolder: string, index: number}
        openTabs = openTabs ? Array.from(new Set(openTabs.filter(t => !!t) )): []
        if (openTabs?.length === 1 && !openFolder) {
          try {
            readFileSync(openTabs[0])
          } catch (e) {
            await MainApi.open(openTabs[0])
          }
        }
        try {
          const s = stat(openFolder)
          if (openFolder && s && s.isDirectory()) {
            treeStore.openFolder(openFolder)
          }
          if (!openTabs?.length) {
            openTabs = treeStore.firstNote ? [treeStore.firstNote.filePath] : []
          }
          if (openTabs.length) {
            // treeStore.restoreTabs(openTabs)
          }
          if (typeof index === 'number' && treeStore.tabs[index]) {
            treeStore.selectTab(index)
          }
          if (treeStore.currentTab?.current) {
            if (treeStore.root) {
              document.title = `${treeStore.root}-${treeStore.currentTab.current.filename}`
            } else {
              document.title = `${treeStore.currentTab.current.filename}`
            }
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

    const create = (e: any) => {
      MainApi.createNewFile({
        defaultPath: treeStore.root?.filePath || ''
      }).then(res => {
        if (res.filePath) {
          // treeStore.openNote(res.filePath)
        }
      })
    }
    const printPdf = () => {
      MainApi.sendToSelf('window-blur')
      if (treeStore.openedNote && treeStore.openedNote.ext === 'md') {
        window.electron.ipcRenderer.send('print-pdf', treeStore.openedNote!.filePath, treeStore.root?.filePath)
      }
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
      if ( treeStore.tabs.length > 1 ) {
        treeStore.removeTab(treeStore.currentIndex)
      } else {
        MainApi.closeWindow()
      }
    }

    const clearUnusedImages = () => {
      if (!treeStore.root) return message$.next({
        type: 'warning',
        content: configStore.zh ? '需要打开文件夹' : 'Need to open a folder'
      })
      modal$.next({
        type: 'confirm',
        params: {
          type: 'info',
          title: configStore.zh ? '提示' : 'Note',
          content: configStore.zh ? '存储区中未被引用的图片将被删除' : 'Unreferenced images in the storage area will be deleted',
          onOk: async () => {
            let imgDirs: IFileItem[] = []
            if (configStore.config.relativePathForImageStore) {
              const stack = treeStore.root?.children!.slice() || []
              const base = basename(configStore.config.imagesFolder)
              while (stack.length) {
                const item = stack.shift()!
                if (item.folder && item.children) {
                  stack.unshift(...item.children)
                  if (item.filename === base) {
                    imgDirs.push(item)
                  }
                }
              }
            } else {
              const item = treeStore.root?.children?.find(item => item.filePath === join(treeStore.root?.filePath || '', configStore.config.imagesFolder))
              if (item) imgDirs.push(item)
            }
            if (imgDirs.length) {
              const usedImages = new Set<string>()
              const stack = treeStore.root?.children!.slice() || []
              while (stack.length) {
                const item = stack.pop()!
                if (item.folder) {
                  stack.push(...item.children!.slice())
                } else {
                  if (item.ext === 'md') {
                    const md = await window.api.fs.readFile(item.filePath, {encoding: 'utf-8'})
                    const match = md.matchAll(urlRegexp)
                    if (match) {
                      for (let m of match) {
                        const url = m[2]
                        if (url.startsWith('http')) continue
                        const path = isAbsolute(url) ? url : join(item.filePath, '..', url)
                        usedImages.add(path)
                      }
                    }
                  }
                }
              }
              for (let dir of imgDirs) {
                const images = await window.api.fs.readdir(dir.filePath)
                const remove = new Set<string>()
                for (let img of images) {
                  const path = join(dir.filePath, img)
                  if (!usedImages.has(path)) {
                    remove.add(path)
                    MainApi.moveToTrash(path)
                  }
                }
                runInAction(() => {
                  dir.children = dir.children?.filter(img => {
                    return !remove.has(img.filePath)
                  })
                })
              }
              message$.next({
                type: 'success',
                content: configStore.zh ? '清除成功' : 'Clear successfully'
              })
            }
          }
        }
      })
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
    window.electron.ipcRenderer.on('clear-recent', clearRecent)
    window.electron.ipcRenderer.on('clear-unused-images', clearUnusedImages)
    return () => {
      window.electron.ipcRenderer.removeListener('open', open)
      window.electron.ipcRenderer.removeListener('close-other-tabs', closeOtherTabs)
      window.electron.ipcRenderer.removeListener('new-tab', newTab)
      window.electron.ipcRenderer.removeListener('close-current-tab', closeCurrentTab)
      window.electron.ipcRenderer.removeListener('close-selected-tab', closeSelectedTab)
      window.electron.ipcRenderer.removeListener('open-file', openFile)
      // window.electron.ipcRenderer.removeListener('create', create)
      window.electron.ipcRenderer.removeListener('call-print-pdf', printPdf)
      window.electron.ipcRenderer.removeListener('clear-recent', clearRecent)
      window.electron.ipcRenderer.removeListener('clear-unused-images', clearUnusedImages)
    }
  }, [])
}
