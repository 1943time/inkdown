import Store from 'electron-store'
import {app} from 'electron'
export const store = new Store()

let lang: 'zh' | 'en' | '' = ''
export const getLocale = () => {
  if (!lang) {
    lang = store.get('config.locale') ? store.get('config.locale') as any : app.getLocale() !== 'zh-CN' ? 'en' : 'zh'
  }
  return lang
}
