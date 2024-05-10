import { relative, join, isAbsolute } from 'path'

export const toRelativePath = (from: string, to: string) => {
  return relative(join(from, '..'), to)
}

export const toAbsolutePath = (filePath: string, target: string) => {
  return isAbsolute(target) ? target :  join(filePath, '..', target)
}

export const isLink = (url: string = '') => /^\w+:\/\//i.test(url)

export const toSpacePath = (rootPath: string, openPath: string, path: string) => {
  if (isLink(path) || isAbsolute(path)) {
    return path
  }

  return join(openPath, '..', path).replace(rootPath + '/', '')
}

export const parsePath = (path: string) => {
  const m = path.match(/#([^\n#\/]+)?$/)
  if (m) {
    return { path: path.replace(m[0], ''), hash: m[1] || '' }
  }
  return { path, hash: null }
}

export const toUnixPath = (path: string) => window.api.toUnix(path)
