import {app} from 'electron'
import Store from 'electron-store'
export const store = new Store()

export const getLocale = (): 'zh' | 'en' => {
  const localCache = (store.get('config') || {} as any).locale
  return ['zh', 'en'].includes(localCache) ? localCache : app.getLocale() === 'zh-CN' ? 'zh' : 'en'
}

export const mediaType = (name?: string) => {
  name = name || ''
  name = name.split('?')[0]
  const ext = name.match(/\.\w+$/)?.[0]
  if (!ext) return 'other'
  if (['.md', '.markdown'].includes(ext)) return 'markdown'
  if (['.png', '.jpg', '.gif', '.svg', '.jpeg', '.webp'].includes(ext)) return 'image'
  if (['.mp3', '.ogg', '.aac', '.wav', '.oga', '.m4a'].includes(ext)) return 'audio'
  if (['.mpg', '.mp4', '.webm', '.mpeg', '.ogv', '.wmv', '.m4v'].includes(ext)) return 'video'
  if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'].includes(ext)) return 'document'
  return 'other'
}
