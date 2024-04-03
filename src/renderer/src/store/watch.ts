import {TreeStore} from './tree'
import {join} from 'path'
import {IFileItem, ISpaceNode} from '../index'
import {openMdParserHandle} from '../editor/parser/parser'
import {existsSync, statSync} from 'fs'
import {db, IFile} from './db'
import {nid} from '../utils'
import {mediaType} from '../editor/utils/dom'
import {createFileNode} from './parserNode'
import {runInAction} from 'mobx'

export class Watcher {
  private fileMap = new Map<string, IFileItem>()
  private ops:{e: 'remove' | 'update', path: string}[] = []
  pause = false
  ignorePath = new Set<string>()
  constructor(
    private readonly store: TreeStore
  ) {
    this.onChange = this.onChange.bind(this)
    window.electron.ipcRenderer.on('window-blur', () => {
      if (this.store.root) {
        window.api.watch(this.store.root.filePath, this.onChange)
        this.getFileMap()
      }
    })
    window.electron.ipcRenderer.on('window-focus', async () => {
      if (this.store.root) {
        window.api.offWatcher(this.store.root.filePath)
        if (this.ops.length) {
          this.perform().finally(() => {
            this.ops = []
            this.ignorePath.clear()
          })
        }
      }
    })
  }
  getFileMap() {
    this.fileMap.clear()
    for (const node of this.store.nodeMap.values()) {
      this.fileMap.set(node.filePath, node)
    }
  }

  async perform() {
    const {parser, terminate} = openMdParserHandle()
    for (const op of this.ops) {
      const {e, path} = op
      const node = this.fileMap.get(path)
      if (e === 'remove' && node) {
        this.store.moveToTrash(node, true)
      }
      if (e === 'update') {
        if (!existsSync(op.path)) continue
        if (node && node.ext === 'md') {
          const [res] = await parser([{filePath: path}])
          node.schema = res.schema
          let changed = false
          this.store.tabs.forEach(t => {
            if (t.current === node) {
              t.store.saveDoc$.next(node.schema!)
              changed = true
            }
          })
          if (!changed) {
            db.file.update(node.cid, {
              schema: node.schema,
              links: res.links
            })
          }
        }
        if (!node) {
          const parentPath = join(path, '..')
          let parent: IFileItem | ISpaceNode | undefined = this.fileMap.get(join(path, '..'))
          if (!parent) parent = this.store.root?.filePath === parentPath ? this.store.root :undefined
          if (!parent) return
          try {
            const s = statSync(path)
            const id = nid()
            const now = Date.now()
            const data:IFile = {
              cid: id,
              lastOpenTime: now,
              folder: s.isDirectory(),
              sort: s.isDirectory() ? 0 : parent.children!.length,
              filePath: path,
              created: now,
              spaceId: this.store.root?.cid,
              updated: s.mtime.valueOf()
            }
            if (mediaType(path) === 'markdown') {
              const [res] = await parser([{filePath: path}])
              data.schema = res.schema
              data.links = res.links
            }
            db.file.add(data)
            const node = createFileNode(data, parent)
            runInAction(() => {
              if (s.isDirectory()) {
                parent!.children!.unshift(node)
              } else {
                parent!.children!.push(node)
              }
            })
            this.store.nodeMap.set(node.cid, node)
            this.fileMap.set(path, node)
          } catch (e) {
            console.error('external change', e)
          }
        }
      }
    }
    terminate()
  }
  public async onChange(e: 'remove' | 'update', path: string) {
    if (this.pause || this.ignorePath.has(path)) return
    this.ops.push({e, path})
  }
}
