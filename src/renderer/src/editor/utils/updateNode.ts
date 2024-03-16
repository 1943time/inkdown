import {IFileItem} from '../../index'
import {toMarkdown} from './toMarkdown'
import {stat, writeFile} from 'fs/promises'
import {db} from '../../store/db'
import {basename, join, parse} from 'path'
import {renameSync} from 'fs'
import {runInAction} from 'mobx'
import {findAbsoluteLinks} from '../../store/parserNode'
import {shareStore} from '../../server/store'

export const updateNode = async (node: IFileItem) => {
  if (node.filePath && node.ext === 'md') {
    const md = toMarkdown(node.schema || [])
    try {
      await writeFile(node.filePath, md, {encoding: 'utf-8'})
      const links = findAbsoluteLinks(node.schema!, node.filePath)
      const s = await stat(node.filePath)
      await db.file.update(node.cid, {
        filePath: node.filePath,
        updated: s.mtime.valueOf(),
        schema: node.schema,
        links
      })
      node.links = links
      db.saveRecord(node)
    } catch (e) {
      console.error('save fail', e)
    }
  }
}

const renameFiles = (nodes: IFileItem[], dir: string, changeFiles: {from: string, to: string}[] = []) => {
  for (let n of nodes) {
    const path = join(dir, basename(n.filePath))
    db.file.update(n.cid, {
      filePath: path
    })
    if (shareStore.docMap.get(n.filePath)) {
      changeFiles.push({from: n.filePath, to: path})
    }
    runInAction(() => {
      n.filePath = path
    })
    if (n.folder && n.children?.length) {
      renameFiles(n.children, path, changeFiles)
    }
  }
  return changeFiles
}

const updateRemotePath = (paths: {from: string, to: string}[], mode: 'doc' | 'book') => {
  return shareStore.api.updateFilePath({
    mode: mode === 'doc' ? 'updateDocs' : 'updateBooks',
    files: paths
  }).then(res => {
    for (const item of paths) {
      if (mode === 'doc') {
        const d = shareStore.docMap.get(item.from)!
        if (d) {
          d.filePath = item.to
          shareStore.docMap.delete(item.from)
          shareStore.docMap.set(item.to, d)
        }
      }
      if (mode === 'book') {
        const d = shareStore.bookMap.get(item.from)!
        if (d) {
          d.filePath = item.to
          shareStore.bookMap.delete(item.from)
          shareStore.bookMap.set(item.to, d)
        }
      }
    }
  })
}
export const updateFilePath = async (node: IFileItem, targetPath: string) => {
  try {
    if (node.filePath === targetPath) return
    if (!node.ghost) {
      renameSync(node.filePath, targetPath)
      const s = await stat(targetPath)
      const oldPath = node.filePath
      runInAction(() => {
        node.filePath = targetPath
        node.filename = parse(targetPath).name
      })
      await db.file.update(node.cid, {
        filePath: targetPath,
        updated: s.mtime.valueOf()
      })
      if (shareStore.serviceConfig) {
        if (node.ext === 'md' && shareStore.docMap.get(oldPath)) {
          updateRemotePath([{from: oldPath, to: node.filePath}], 'doc')
        }
      }
      if (node.folder) {
        const changeFiles = renameFiles(node.children || [], targetPath)
        if (changeFiles.length) {
          await updateRemotePath(changeFiles, 'doc')
        }
        if (shareStore.bookMap.get(oldPath)) {
          await updateRemotePath([{from: oldPath, to: node.filePath}], 'book')
        }
      }
    } else {
      runInAction(() => {
        node.filePath = targetPath
        node.filename = parse(targetPath).name
      })
    }
  } catch (e) {
    console.error('update filePath', e)
  }
}
