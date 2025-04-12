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
