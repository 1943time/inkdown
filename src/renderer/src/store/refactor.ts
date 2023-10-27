import {IFileItem} from '../index'
import {basename, isAbsolute, join, relative} from 'path'
import {mediaType} from '../editor/utils/dom'
import {db} from './db'
import {isExist} from '../utils'
import {existsSync} from 'fs'

const urlRegexp = /\[([^\]\n]*)]\(([^)\n]+)\)/g
export const refactor = async (paths: [string, string][], files: IFileItem[]) => {
  const stack = files.slice()
  const depFiles =  new Set<IFileItem>()
  const changeFiles = new Set<IFileItem>()
  const changeFilesPath = new Map(paths.map(p => [p[1], p[0]]))
  const oldPathMap = new Map(paths)
  while (stack.length) {
    const item = stack.pop()!
    if (item.folder) {
      stack.push(...item.children || [])
    } else {
      if (item.ext !== 'md') continue
      const filePath = item.filePath
      if (changeFilesPath.has(filePath) && join(filePath, '..') !== join(changeFilesPath.get(filePath)!, '..')) {
        changeFiles.add(item)
      }
      let file = await window.api.fs.readFile(filePath, {encoding: 'utf-8'})
      let fileChange = false
      file = file.replace(urlRegexp, (m, text: string, url: string) => {
        if (/^https?:/.test(url)) return m
        const absolute = isAbsolute(url)
        const linkPath = absolute ? url : join(changeFilesPath.get(filePath) || filePath, '..', url)
        if (oldPathMap.get(linkPath)) {
          fileChange = true
          if (absolute) {
            return `[${text}](${oldPathMap.get(linkPath)})`
          } else {
            const changePath = relative(join(filePath, '..'), oldPathMap.get(linkPath)!)
            return `[${text}](${window.api.toUnix(changePath)})`
          }
        }
        return m
      })
      file = file.replace(/<img[^\n><]+\/?>(?:<\/img>)?/g, (str) => {
        const match = str.match(/src="([^\n"]+)"/)
        if (match) {
          const url = match[1]
          if (/^https?:/.test(url)) return str
          const absolute = isAbsolute(url)
          const linkPath = absolute ? url : join(changeFilesPath.get(filePath) || '', '..', url)
          if (existsSync(linkPath)) {
            fileChange = true
            if (absolute) {
              str = str.replace(/src="[^\n"]+"/, `src="${linkPath}"`)
            } else {
              const changePath = relative(join(filePath, '..'), linkPath)
              str = str.replace(/src="[^\n"]+"/, `src="${window.api.toUnix(changePath)}"`)
            }
          }
        }
        return str
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
    const oldPath = n.filePath
    n.filePath = join(filePath, basename(n.filePath))
    if (n.folder) {
      renameAllFiles(n.filePath, n.children || [])
    }
    if (n.ext === 'md') {
      db.history.where('filePath').equals(oldPath).modify({
        filePath: n.filePath
      })
    }
  }
}
