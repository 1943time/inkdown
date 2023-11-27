import {useCallback, useEffect} from 'react'
import {MainApi} from '../api/main'
import {treeStore} from '../store/tree'
import {message$, modal$, stat, toArrayBuffer} from '../utils'
import {exportHtml} from '../editor/output/html'
import {clearExpiredRecord, db} from '../store/db'
import {runInAction} from 'mobx'
import {isAbsolute, join} from 'path'
import {existsSync} from 'fs'
import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

const urlRegexp = /\[([^\]\n]*)]\(([^)\n]+)\)/g
const isImage = /[\w_-]+\.(png|webp|jpg|jpeg|gif)/i

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

    const clearUnusedImages = () => {
      if (!treeStore.root) return message$.next({
        type: 'warning',
        content: 'Need to open a folder'
      })
      modal$.next({
        type: 'confirm',
        params: {
          type: 'info',
          title: 'Note',
          content: 'Unused images in .images folder will be moved to trash',
          onOk: async () => {
            const imgDir = join(treeStore.root.filePath, '.images')
            if (existsSync(imgDir)) {
              const usedImages = new Set<string>()
              const stack = treeStore.root.children!.slice()
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
              const images = await window.api.fs.readdir(imgDir)
              const remove = new Set<string>()
              for (let img of images) {
                const path = join(imgDir, img)
                if (!usedImages.has(path)) {
                  remove.add(path)
                  MainApi.moveToTrash(path)
                }
              }
              const imgFolder = treeStore.root.children!.find(c => c.filename === '.images')
              if (imgFolder) {
                runInAction(() => {
                  imgFolder.children = imgFolder.children!.filter(img => {
                    return !remove.has(img.filePath)
                  })
                })
              }
              message$.next({
                type: 'success',
                content: 'Clear successfully'
              })
            }
          }
        }
      })
    }

    const convertRemoteImages = async () => {
      if (treeStore.openedNote?.ext === 'md') {
        const schema = treeStore.schemaMap.get(treeStore.openedNote)
        if (schema?.state) {
          const stack = schema.state.slice()
          const store = treeStore.currentTab.store
          let change = false
          while (stack.length) {
            const item = stack.pop()!
            if (!item.text && item.type !== 'media' && item.children?.length) {
              stack.push(...item.children!.slice())
            } else {
              if (item.type === 'media' && item.url?.startsWith('http')) {
                const ext = item.url.match(/[\w_-]+\.(png|webp|jpg|jpeg|gif)/i)
                if (ext) {
                  try {
                    change = true
                    const res = await window.api.got.get(item.url, {
                      responseType: 'buffer'
                    })
                    const path = await store.saveFile({
                      name: Date.now().toString(16) + '.' + ext[1].toLowerCase(),
                      buffer: toArrayBuffer(res.rawBody)
                    })
                    Transforms.setNodes(store.editor, {
                      url: path
                    }, {at: ReactEditor.findPath(store.editor, item)})
                  } catch (e) {}
                }
              }
            }
          }
          message$.next({
            type: 'info',
            content: change ? 'Conversion successful' : 'The current note does not include network images'
          })
        }
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
    window.electron.ipcRenderer.on('clear-unused-images', clearUnusedImages)
    window.electron.ipcRenderer.on('convert-remote-images', convertRemoteImages)
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
      window.electron.ipcRenderer.removeListener('clear-unused-images', clearUnusedImages)
      window.electron.ipcRenderer.removeListener('convert-remote-images', convertRemoteImages)
    }
  }, [])
}
