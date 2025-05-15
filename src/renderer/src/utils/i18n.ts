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
  lng: 'en_US',
  fallbackLng: 'en_US',
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
