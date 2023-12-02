import {app} from 'electron'
import Store from 'electron-store'
export const store = new Store()

export const getLocale = (): 'zh' | 'en' => {
  const localCache = (store.get('config') || {} as any).locale
  return ['zh', 'en'].includes(localCache) ? localCache : app.getLocale() === 'zh-CN' ? 'zh' : 'en'
}
