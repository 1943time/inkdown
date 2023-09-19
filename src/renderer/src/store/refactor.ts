import {IFileItem} from '../index'
import {basename, isAbsolute, join, relative} from 'path'
import {mediaType} from '../editor/utils/dom'
import {db} from './db'
import {isExist} from '../utils'

const urlRegexp = /\[([^\]\n]*)]\(([^)\n]+)\)/g
export const refactor = async (paths: [string, string][], files: IFileItem[]) => {
  const stack = files.slice()
  const depFiles =  new Set<IFileItem>()
  const changeFiles = new Set<IFileItem>()
  const changeFilesPath = new Map(paths.map(p => [p[1], p[0]]))
  while (stack.length) {
    const item = stack.pop()!
    if (item.folder) {
      stack.push(...item.children || [])
    } else {
      const filePath = item.filePath
      if (changeFilesPath.has(filePath) && join(filePath, '..') !== join(changeFilesPath.get(filePath)!, '..') && mediaType(filePath) === 'markdown') {
        changeFiles.add(item)
      }
      let file = await window.api.fs.readFile(filePath, {encoding: 'utf-8'})
      let fileChange = false
      file = file.replace(urlRegexp, (m, text: string, url: string) => {
        if (/^https?:/.test(url)) return m
        const absolute = isAbsolute(url)
        const linkPath = absolute ? url : join(filePath, '..', url)
        for (let p of paths) {
          if (linkPath === p[0]) {
            fileChange = true
            if (absolute) {
              return `[${text}](${p[1]})`
            } else {
              const changePath = relative(join(filePath, '..'), p[1])
              return `[${text}](${window.api.toUnix(changePath)})`
            }
          }
        }
        return m
      })
      if (fileChange) {
        await window.api.fs.writeFile(filePath, file, {encoding: 'utf-8'})
        depFiles.add(item)
      }
    }
  }
  for (let fileItem of changeFiles) {
    let file = await window.api.fs.readFile(fileItem.filePath, {encoding: 'utf-8'})
    let fileChange = false
    file = file.replace(urlRegexp, (m, text: string, url: string) => {
      if (url.startsWith('http:')) return m
      if (!isAbsolute(url)) {
        const linkPath = join(changeFilesPath.get(fileItem.filePath)!, '..', url)
        if (isExist(linkPath)) {
          const changePath = relative(join(fileItem.filePath, '..'), linkPath)
          if (changePath !== url) {
            fileChange = true
            return `[${text}](${window.api.toUnix(changePath)})`
          }
        }
      }
      return m
    })
    if (fileChange) {
      await window.api.fs.writeFile(fileItem.filePath, file, {encoding: 'utf-8'})
      depFiles.add(fileItem)
    }
  }
  return Array.from(depFiles)
}


export const renameAllFiles = (filePath: string, nodes: IFileItem[]) => {
  for (let n of nodes) {
    const newPath = join(filePath, basename(n.filePath))
    if (n.folder) {
      renameAllFiles(n.filePath, n.children || [])
    }
    if (n.ext === 'md') {
      db.history.where('filePath').equals(n.filePath).modify({
        filePath: newPath
      })
    }
    n.filePath = newPath
  }
}
