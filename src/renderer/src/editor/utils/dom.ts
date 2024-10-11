import { remove as removeDiacritics } from 'diacritics'
const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g
export const getOffsetTop = (dom: HTMLElement, target: HTMLElement = document.body) => {
  let top = 0
  while (target.contains(dom.offsetParent) && target !== dom) {
    top += dom.offsetTop
    dom = dom.offsetParent as HTMLElement
  }
  return top
}

export const getOffsetLeft = (dom: HTMLElement, target: HTMLElement = document.body) => {
  let left = 0
  while (target.contains(dom) && target !== dom) {
    left += dom.offsetLeft
    dom = dom.offsetParent as HTMLElement
  }
  return left
}

export const slugify = (str: string): string => {
  return (
    removeDiacritics(str)
      // Remove control characters
      .replace(rControl, '')
      // Replace special characters
      .replace(rSpecial, '-')
      // Remove continuous separators
      .replace(/\-{2,}/g, '-')
      // Remove prefixing and trailing separators
      .replace(/^\-+|\-+$/g, '')
      // ensure it doesn't start with a number (#121)
      .replace(/^(\d)/, '_$1')
      // lowercase
      .toLowerCase()
  )
}

export const mediaType = (name?: string) => {
  name = name || ''
  name = name.split('?')[0]
  const ext = name.toLowerCase().match(/\.\w+$/)?.[0]
  if (!ext) return 'other'
  if (['.md', '.markdown'].includes(ext)) return 'markdown'
  if (['.png', '.jpg', '.gif', '.svg', '.jpeg', '.webp'].includes(ext)) return 'image'
  if (['.mp3', '.ogg', '.aac', '.wav', '.oga', '.m4a'].includes(ext)) return 'audio'
  if (['.mpg', '.mp4', '.webm', '.mpeg', '.ogv', '.wmv', '.m4v'].includes(ext)) return 'video'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.html'].includes(ext)) return 'document'
  return 'other'
}

export const getSelRect = () => {
  try {
    const domSelection = window.getSelection()
    const domRange = domSelection?.getRangeAt(0)
    return domRange?.getBoundingClientRect() || null
  } catch(e) {
    return null
  }
}
