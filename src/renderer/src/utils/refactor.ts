import {treeStore, TreeStore} from '../store/tree'
import {IFileItem} from '../index'
import {CustomLeaf} from '../el'
import {basename, isAbsolute, join, relative} from 'path'
import {parsePath} from './index'
import {toMarkdown} from '../editor/utils/toMarkdown'
import {stat, writeFile} from 'fs/promises'
import {db} from '../store/db'
import {configStore} from '../store/config'

type LinkMap = Map<IFileItem, {
  schema: any[]
  links: [string, CustomLeaf, string | null][]
}>

const findLinks = (node: IFileItem) => {
  const links: [string, CustomLeaf, string | null][] = []
  const schema = JSON.parse(JSON.stringify(node.schema || []))
  const stack= schema.slice()
  while (stack.length) {
    const item = stack.pop()!
    if (item.url && item.url && !item.url.startsWith('http') && !isAbsolute(item.url) && !item.url.startsWith('#')) {
      const {path, hash} = parsePath(item.url)
      links.push([join(node.filePath, '..', path), item, hash])
    }
    if (item.children?.length) {
      stack.push(...item.children)
    }
  }
  return {schema, links}
}

const checkSelf = async (node: IFileItem, linkMap: LinkMap) => {
  if (node.ext === 'md') {
    if (!linkMap.get(node)) return
    const {schema, links} = linkMap.get(node)!
    let changed = false
    for (const [url, leaf, hash] of links) {
      const newPath = relative(join(node.filePath, '..'), url)
      leaf.url = `${newPath}${hash ? `#${hash}` : ''}`
      changed = true
    }
    if (changed) {
      try {
        let changed = false
        for (let t of treeStore.tabs) {
          if (t.current === node) {
            t.store.saveDoc$.next(schema)
            changed = true
          }
        }
        if (changed) return
        const md = toMarkdown(schema)
        node.schema = schema
        await writeFile(node.filePath, md, {encoding: 'utf-8'})
        const s = await stat(node.filePath)
        db.file.update(node.cid, {
          updated: s.mtime.valueOf(),
          schema: schema
        })
      } catch (e) {
        console.error(e)
      }
    }
  }
}

export const getLinkMap = (tree: TreeStore) => {
  const map:LinkMap = new Map()
  for (let n of tree.nodeMap.values()) {
    if (!n.folder && n.ext === 'md') {
      map.set(n, findLinks(n))
    }
  }
  return map
}

export const refactorDepLink = async (linkMap: LinkMap, node: IFileItem) => {
  if (!configStore.config.autoRebuild) return
  if (node.folder) {
    for (const n of node.children!) {
      if (n.folder) {
        await refactorDepLink(linkMap, n)
      } else {
        await checkSelf(n, linkMap)
      }
    }
  } else {
    await checkSelf(node, linkMap)
  }
}

const checkDepOn = async (linkMap: LinkMap, target: IFileItem, oldPath: string) => {
  for (const [node, ctx] of linkMap) {
    let changed = false
    for (let l of ctx.links) {
      if (l[0] === oldPath) {
        const newPath = relative(join(node.filePath, '..'), target.filePath)
        l[1].url = `${newPath}${l[2] ? `#${l[2]}` : ''}`
        changed = true
      }
    }
    if (changed) {
      let nodeChanged = false
      for (let t of treeStore.tabs) {
        if (t.current === node) {
          t.store.saveDoc$.next(ctx.schema)
          nodeChanged = true
        }
      }
      if (nodeChanged) return
      try {
        const md = toMarkdown(ctx.schema)
        node.schema = ctx.schema
        await writeFile(node.filePath, md, {encoding: 'utf-8'})
        const s = await stat(node.filePath)
        db.file.update(node.cid, {
          updated: s.mtime.valueOf(),
          schema: ctx.schema
        })
      } catch (e) {
        console.error(e)
      }
    }
  }
}

export const refactorDepOnLink = async (linkMap: LinkMap, node: IFileItem, oldPath: string) => {
  if (!configStore.config.autoRebuild) return
  if (node.folder) {
    for (const n of node.children!) {
      if (n.folder) {
        await refactorDepOnLink(linkMap, n, join(oldPath, basename(n.filePath)))
      } else {
        await refactorDepOnLink(linkMap, n, join(oldPath, basename(n.filePath)))
      }
    }
  } else {
    await checkDepOn(linkMap, node, oldPath)
  }
}
