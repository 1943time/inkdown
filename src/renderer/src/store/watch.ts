import {TreeStore} from './tree'
import {join, sep} from 'path'
import {runInAction} from 'mobx'
import {createFileNode, defineParent, parserNode, sortFiles} from './parserNode'
import {mediaType} from '../editor/utils/dom'
import {IFileItem} from '../index'
import {lstatSync, readFileSync} from 'fs'
import {removeFileRecord} from './db'
import {parserMdToSchema} from '../editor/parser/parser'

export class Watcher {
  private changeHistory = new Set<string>()
  private watchNoteSet = new Set<string>()

  constructor(
    private readonly store: TreeStore
  ) {
    this.onChange = this.onChange.bind(this)
    window.electron.ipcRenderer.on('window-blur', () => {
      setTimeout(() => {
        if (this.store.root?.filePath) {
          window.api.watch(this.store.root.filePath, this.onChange)
        }
        if (this.watchNoteSet.size) {
          for (let f of this.watchNoteSet) {
            window.api.watch(f, this.onChange)
          }
        }
      }, 100)
    })
    window.electron.ipcRenderer.on('window-focus', async () => {
      if (this.store.root?.filePath) {
        window.api.offWatcher(this.store.root.filePath)
      }

      if (this.watchNoteSet.size) {
        for (let f of this.watchNoteSet) {
          window.api.offWatcher(f)
        }
      }

      if (!this.changeHistory.size) return
      const filesMap = new Map(this.store.nodes.map(f => [f.filePath, f]))
      for (let path of this.changeHistory) {
        if (mediaType(path) !== 'markdown') continue
        const node = filesMap.get(path)
        if (node) {
          const [schema] = await parserMdToSchema([readFileSync(node.filePath, {encoding: 'utf-8'})])
          this.store.schemaMap.set(node, {
            state: schema
          })
        } else {
          for (let t of this.store.tabs) {
            for (let f of t.history) {
              if (f.independent && f.filePath === path) {
                const [schema] = await parserMdToSchema([readFileSync(f.filePath, {encoding: 'utf-8'})])
                this.store.schemaMap.set(f, {
                  state: schema
                })
              }
            }
          }
        }
        this.store.externalChange$.next(path)
      }
      this.changeHistory.clear()
    })
  }

  public onChange(e: 'remove' | 'update', path: string, node?: IFileItem) {
    if (path.split(sep).some(p => p.startsWith('.') && p !== '.images')) return
    const nodesMap = this.store.getFileMap(true)
    const target = nodesMap.get(path)
    const parent = nodesMap.get(join(path, '..'))!
    if (target && e === 'remove') {
      if (target.folder) {
        runInAction(() => {
          parent?.children!.splice(parent.children!.findIndex(n => n.filePath === path), 1)
          this.store.tabs.forEach(t => {
            t.history  = t.history.filter(f => !f.filePath.startsWith(path))
            if (t.index > 0 && t.index > t.history.length - 1) {
              t.index = t.history.length - 1
            }
          })
        })
      } else {
        runInAction(() => {
          const index = parent.children!.findIndex(n => n.filePath === path)
          if (index !== -1) {
            parent?.children!.splice(index, 1)
            this.store.tabs.forEach(t => {
              t.history = t.history.filter(h => h.filePath !== path)
              if (t.index > t.history.length - 1) {
                t.index = t.history.length - 1
              }
            })
          }
          if (target.ext === 'md') {
            removeFileRecord(target.filePath)
          }
        })
      }
    }
    if (e === 'update') {
      if (target || !path.startsWith(this.store.root?.filePath)) {
        this.changeHistory.add(path)
      } else {
        const stat = lstatSync(path)
        if (stat.isDirectory()) {
          if (parent.children && !parent.children.find(c => c.filePath === path)) {
            if (!node) {
              const {root} = parserNode(path)
              root.root = false
              defineParent(root, parent)
              runInAction(() => {
                parent.children!.push(root)
              })
            } else {
              runInAction(() => {
                parent.children!.push(node!)
              })
            }
          }
        } else {
          if (parent.children && !parent.children.find(c => c.filePath === path)) {
            runInAction(() => {
              if (!node) node = createFileNode({
                folder: false,
                parent: parent,
                filePath: path
              })
              parent.children!.push(node)
            })
          }
        }
      }
    }
    if (parent) {
      runInAction(() => {
        parent.children = sortFiles(parent.children!)
      })
    }
  }

  watchNote(filePath: string) {
    this.watchNoteSet.add(filePath)
  }

  off(path: string) {
    return window.api.offWatcher(path)
  }

  async openDirCheck() {
    const nodesMap = this.store.getFileMap(true)
    for (let t of this.store.tabs) {
      for (let h of t.history) {
        if (h.independent) {
          await this.off(h.filePath)
          this.watchNoteSet.delete(h.filePath)
          if (h.filePath.startsWith(this.store.root.filePath)) {
            runInAction(() => {
              const node = nodesMap.get(h.filePath)
              if (node) {
                t.history.splice(t.history.indexOf(h), 1, node)
              }
            })
          }
        }
      }
    }
  }

  destroy() {
    if (!this.store.root) return
    window.api.offWatcher(this.store.root.filePath)
  }
}
