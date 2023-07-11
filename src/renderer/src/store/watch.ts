import {TreeStore} from './tree'
import {basename, join} from 'path'
import {runInAction} from 'mobx'
import {createFileNode, sortFiles} from './parserNode'
import {markdownParser} from '../editor/parser'
import {mediaType} from '../editor/utils/dom'

export class Watcher {
  fileCheck = true
  changeHistory = new Set<string>()

  constructor(
    private readonly store: TreeStore
  ) {
    this.onChange = this.onChange.bind(this)
    window.electron.ipcRenderer.on('window-focus', () => {
      setTimeout(() => {
        if (!this.changeHistory.size) return
        const filesMap = new Map(this.store.files.map(f => [f.filePath, f]))
        for (let path of this.changeHistory) {
          if (mediaType(path) !== 'markdown') continue
          const node = filesMap.get(path)
          if (node) {
            const schema = markdownParser(node.filePath).schema
            this.store.schemaMap.set(node, {
              state: schema
            })
          } else {
            for (let f of this.store.currentTab.history) {
              if (f.independent && f.filePath === path) {
                const schema = markdownParser(f.filePath).schema
                this.store.schemaMap.set(f, {
                  state: schema
                })
              }
            }
          }
          this.store.externalChange$.next(path)
        }
        this.changeHistory.clear()
      }, 300)
    })
  }

  private onChange(e: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir', path: string) {
    if (this.fileCheck) {
      if (e === 'change') {
        this.changeHistory.add(path)
      } else {
        try {
          if (!this.store.root || !path.startsWith(this.store.root.filePath)) return
          const nodesMap = new Map(this.store.nodes.map(n => [n.filePath, n]))
          const parent = nodesMap.get(join(path, '..'))!
          switch (e) {
            case 'add':
              if (parent.children && !parent.children.find(c => c.filePath === path)) {
                runInAction(() => {
                  parent.children!.push(createFileNode({
                    folder: false,
                    parent: parent,
                    fileName: basename(path)
                  }))
                })
              }
              break
            case 'unlink':
              runInAction(() => {
                parent?.children!.splice(parent.children!.findIndex(n => n.filePath === path), 1)
                this.store.currentTab.history = this.store.currentTab.history.filter(h => h.filePath !== path)
                if (this.store.currentTab.index > this.store.currentTab.history.length - 1) {
                  this.store.currentTab.index = this.store.currentTab.history.length - 1
                }
              })
              break
            case 'addDir':
              if (parent.children && !parent.children.find(c => c.filePath === path)) {
                runInAction(() => {
                  parent.children!.push(createFileNode({
                    folder: true,
                    parent: parent,
                    fileName: basename(path)
                  }))
                })
              }
              break
            case 'unlinkDir':
              runInAction(() => {
                parent?.children!.splice(parent.children!.findIndex(n => n.filePath === path), 1)
              })
              break
          }
          if (parent) {
            runInAction(() => {
              parent.children = sortFiles(parent.children!)
            })
          }
        } catch (e) {
          console.error('watch result err', e)
        }
      }
    }
  }

  watch() {
    if (!this.store.root) return
    window.api.watch(this.store.root.filePath, this.onChange)
  }

  watchNote(filePath: string) {
    window.api.watch(filePath, this.onChange)
  }

  off(path: string) {
    return window.api.offWatcher(path)
  }

  async openDirCheck() {
    const history = this.store.currentTab.history
    const nodesMap = new Map(this.store.nodes.map(n => [n.filePath, n]))
    for (let h of history) {
      if (h.independent) {
        await this.off(h.filePath)
        if (h.filePath.startsWith(this.store.root.filePath)) {
          runInAction(() => {
            const node = nodesMap.get(h.filePath)
            if (node) {
              history.splice(history.indexOf(h), 1, node)
            }
          })
        }
      }
    }
  }

  pause() {
    this.fileCheck = false
    setTimeout(() => {
      this.fileCheck = true
    }, 1000)
  }

  destroy() {
    if (!this.store.root) return
    window.api.offWatcher(this.store.root.filePath)
  }
}
