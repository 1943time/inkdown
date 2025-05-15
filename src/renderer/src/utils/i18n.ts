import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en_US.json'
import zh from '../locales/zh_CN.json'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en
    },
    zh: {
      translation: zh
    }
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof import('../locales/zh_CN.json')
    }
  }
}
export const getSystemLanguage = () => {
  const systemLang = navigator.language
  const lang = systemLang.split('-')[0]
  return lang === 'zh' ? 'zh' : 'en'
}
