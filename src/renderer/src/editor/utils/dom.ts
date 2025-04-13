import { remove as removeDiacritics } from 'diacritics'
import xss from 'xss'
const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g
export const slugify = (str: string = ''): string => {
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

export const slugifyUrl = (str: string = ''): string => {
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
  if (['.mpg', '.mp4', '.webm', '.mpeg', '.ogv', '.wmv', '.m4v', '.ogg', '.av1'].includes(ext)) return 'video'
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


export const nodeResize = (ctx: { e: React.MouseEvent; dom: HTMLElement; height?: number; cb: Function }) => {
  const height = ctx.height || ctx.dom.clientHeight
  const startY = ctx.e.clientY
  let resizeHeight = height
  const move = (e: MouseEvent) => {
    resizeHeight = height + e.clientY - startY
    if (resizeHeight < 50) {
      resizeHeight = 50
    }
    ctx.dom.parentElement!.style.height = resizeHeight + 'px'
  }
  window.addEventListener('mousemove', move)
  window.addEventListener(
    'mouseup',
    (e) => {
      window.removeEventListener('mousemove', move)
      e.stopPropagation()
      ctx.cb(resizeHeight)
    },
    { once: true }
  )
}


export const filterScript = (str: string) => {
  return xss(str, {
    css: false,
    onIgnoreTagAttr: (_, name, value) => {
      if (name === 'style') {
        return `${name}="${value}"`
      }
      return ''
    }
  })
}
