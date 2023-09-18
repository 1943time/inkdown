import {IFileItem} from '../index'
import {isAbsolute, join, relative} from 'path'
import {mediaType} from '../editor/utils/dom'
import {isExist} from '../share/sync/utils'

const urlRegexp = /\[([^\]\n]*)]\(([^)\n]+)\)/g
export const refactor = async (oldPath: string, targetPath: string, files: IFileItem[]) => {
  const stack = files.slice()
  let changeFiles:IFileItem[] = []
  let current:IFileItem | null = null
  while (stack.length) {
    const item = stack.pop()!
    if (item.folder) {
      stack.push(...item.children || [])
    } else {
      try {
        const filePath = item.filePath
        if (filePath === targetPath) current = item
        let file = await window.api.fs.readFile(filePath, {encoding: 'utf-8'})
        let fileChange = false
        file = file.replace(urlRegexp, (m, text: string, url: string) => {
          if (url.startsWith('http:')) return m
          const absolute = isAbsolute(url)
          const linkPath = absolute ? url : join(filePath, '..', url)
          if (linkPath === oldPath) {
            fileChange = true
            if (absolute) return `[${text}](${targetPath})`
            const changePath = relative(join(filePath, '..'), targetPath)
            return `[${text}](${changePath})`
          }
          return m
        })
        if (fileChange) {
          await window.api.fs.writeFile(filePath, file, {encoding: 'utf-8'})
          changeFiles.push(item)
        }
      } catch (e) {}
    }
  }
  if (mediaType(targetPath) === 'markdown' && join(oldPath, '..') !== join(targetPath, '..')) {
    let file = await window.api.fs.readFile(targetPath, {encoding: 'utf-8'})
    let fileChange = false
    file = file.replace(urlRegexp, (m, text: string, url: string) => {
      if (url.startsWith('http:')) return m
      if (!isAbsolute(url)) {
        const linkPath = join(oldPath, '..', url)
        if (isExist(linkPath)) {
          const changePath = relative(join(targetPath, '..'), linkPath)
          fileChange = true
          return `[${text}](${changePath})`
        }
      }
      return m
    })
    if (fileChange && current) {
      await window.api.fs.writeFile(targetPath, file, {encoding: 'utf-8'})
      if (!changeFiles.includes(current)) {
        changeFiles.push(current)
      }
    }
  }
  return changeFiles
}

export const visitElements = (els: any[], fn: (el: any) => void) => {
  for (let el of els) {
    fn(el)
    if (el.children?.length) {
      visitElements(el.children, fn)
    }
  }
}
