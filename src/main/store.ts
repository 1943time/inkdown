import Store from 'electron-store'
import {app} from 'electron'
export const store = new Store()
let lang: 'zh' | 'en' | '' = ''
export const getLocale = () => {
  if (!lang) {
    lang = store.get('config.locale') ? store.get('config.locale') as any : app.getSystemLocale() !== 'zh-CN' ? 'en' : 'zh'
  }
  return lang
}
