import { mediaType } from '@/editor/utils/dom'
import { customAlphabet } from 'nanoid'

export const copy = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

export function getAllProperties(obj: any): Map<string, any> {
  const properties = new Map<string, any>()
  function gatherProperties(currentObj: any) {
    const ownPropertyNames = Object.getOwnPropertyNames(currentObj)
    for (const key of ownPropertyNames) {
      properties.set(key, currentObj[key])
    }

    // 获取当前对象的原型
    const proto = Object.getPrototypeOf(currentObj)
    if (proto !== null) {
      gatherProperties(proto)
    }
  }
  gatherProperties(obj)
  return properties
}

export function os() {
  if (/macintosh|mac os x/i.test(navigator.userAgent)) {
    return 'mac'
  }
  if (/Linux/i.test(navigator.userAgent)) {
    return 'linux'
  }
  return 'windows'
}

export const isMod = (e: MouseEvent | KeyboardEvent | React.KeyboardEvent | React.MouseEvent) => {
  return e.metaKey || e.ctrlKey
}

export function base64ToArrayBuffer(base64: string) {
  const binaryString = window.atob(base64.replace(/^base64,/, ''))
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export const delay = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

export const dataTransform = (value: string) => {
  switch (value) {
    case 'true':
      return true
    case 'false':
      return false
    case 'null':
      return null
    case 'undefined':
      return undefined
    default:
      if (/^[\[{]/.test(value)) {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      if (/^\d+$/.test(value)) {
        return Number(value)
      }
      return value
  }
}

export const stringTransform = (value: any): string => {
  if (value == null) {
    return String(value)
  }
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'number':
      return value.toString()
    case 'object':
      return JSON.stringify(value)
    default:
      return String(value)
  }
}

export const isValidUrl = (url: string): boolean => {
  try {
    if (url.match(/^[a-zA-Z]:\\/)) {
      return false
    }
    if (url.startsWith('./') || url.startsWith('../')) {
      return false
    }
    if (url.startsWith('/')) {
      return false
    }
    if (url.startsWith('\\\\')) {
      return false
    }
    if (url.startsWith('file://')) {
      return false
    }
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const kb = 1024
export const mb = kb * 1024
export const gb = mb * 1024
export const sizeUnit = (size: number) => {
  const symbol = size >= 0 ? '' : '-'
  const abSize = Math.abs(size)
  if (abSize > gb) return symbol + (abSize / gb).toFixed(2) + ' GB'
  if (abSize > mb) return symbol + (abSize / mb).toFixed(2) + ' MB'
  if (abSize > kb) return symbol + (abSize / kb).toFixed(2) + ' KB'
  return symbol + abSize + ' B'
}

export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach((key) => {
    delete result[key]
  })
  return result as Omit<T, K>
}

export const isDark = () => {
  return window.matchMedia && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export const nid = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  15
)

export const delayRun = (fn: Function) => {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      fn()
    })
  } else {
    setTimeout(fn, 16)
  }
}

export const toUnixPath = (path: string) => {
  return path.replace(/\\/g, '/')
}

export const getRemoteMediaExt = async (url: string): Promise<[string, string] | null> => {
  try {
    const controller = new AbortController()
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    })
    if (!res.ok) {
      throw new Error()
    }
    setTimeout(() => {
      controller.abort()
    }, 1000)
    const contentType = res.headers.get('content-type') || ''
    return [contentType.split('/')[0], contentType.split('/')[1]]
  } catch (e) {
    return null
  }
}
