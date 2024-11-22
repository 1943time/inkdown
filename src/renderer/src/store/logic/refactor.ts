import { basename, isAbsolute, join, relative } from 'path'
import { IFileItem } from '../../types'
import { copy } from '../../utils'
import { Core } from '../core'
import { parsePath, toUnixPath } from '../../utils/path'
import { db } from '../db'

export class Refactor {
  constructor(
    private readonly core: Core
  ) {}

  private findElByPath(schema: any[], path: number[]): any | null {
    try {
      return path.reduce((data, index, i) => {
        if (i !== path.length - 1) {
          return data[index]?.children
        }
        return data[index]
      }, schema)
    } catch (e) {
      console.warn('Not find link', schema, path, e)
      return null
    }
  }

  private checkSelf(node: IFileItem) {
    if (node.ext === 'md' && node.links?.length) {
      let schema = copy(node.schema!)
      let changed = false
      for (let l of node.links) {
        const el = this.findElByPath(schema!, l.path)
        if (el && el.url && !isAbsolute(el.url)) {
          const ps = parsePath(el.url)
          el.url = toUnixPath(relative(join(node.filePath, '..'), l.target))
          l.target = join(node.filePath, '..', el.url)
          if (ps.hash) el.url += `#${ps.hash}`
          changed = true
        }
      }
      if (changed) {
        db.file.update(node.cid, {
          schema, links: node.links
        })
        node.schema = schema
        for (let t of this.core.tree.tabs) {
          if (t.current === node) {
            t.store.saveDoc$.next(node.schema)
          }
        }
      }
    }
  }
  private checkDepOn(target: IFileItem, oldPath: string) {
    for (const [, node] of this.core.tree.nodeMap) {
      if (!node.folder && node.links?.length) {
        if (node.links.some(l => l.target === oldPath)) {
          const schema = copy(node.schema!)
          let changed = false
          for (const l of node.links) {
            const el = this.findElByPath(schema!, l.path)
            if (el && el.url && !isAbsolute(el.url)) {
              const ps = parsePath(el.url)
              el.url = toUnixPath(relative(join(node.filePath, '..'), target.filePath))
              l.target = join(node.filePath, '..', el.url)
              if (ps.hash) el.url += `#${ps.hash}`
              changed = true
            }
          }
          if (changed) {
            db.file.update(node.cid, {
              schema, links: node.links
            })
            node.schema = schema
            for (let t of this.core.tree.tabs) {
              if (t.current === node) {
                t.store.saveDoc$.next(node.schema)
              }
            }
          }
        }
      }
    }
  }
  refactorDepLink(node: IFileItem) {
    if (node.folder) {
      for (const n of node.children!) {
        if (n.folder) {
          this.refactorDepLink(n)
        } else {
          this.checkSelf(n)
        }
      }
    } else {
      this.checkSelf(node)
    }
  }
  refactorDepOnLink(node: IFileItem, oldPath: string) {
    if (node.folder) {
      for (const n of node.children!) {
        if (n.folder) {
          this.refactorDepOnLink(n, join(oldPath, basename(n.filePath)))
        } else {
          this.checkDepOn(n, join(oldPath, basename(n.filePath)))
        }
      }
    } else {
      this.checkDepOn(node, oldPath)
    }
  }
}
