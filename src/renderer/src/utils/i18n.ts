import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const loadLocales = async () => {
  const zh = await import('../locales/zh.json')
  return {
    en: {
      translation: {
        test: 'Welcome to React and react-i18next'
      }
    },
    zh: {
      translation: zh.default
    }
  }
}

const initI18n = async () => {
  const resources = await loadLocales()
  i18n.use(initReactI18next).init({
    resources,
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    }
  })
}
initI18n()

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      translation: typeof import('../locales/zh.json')
    }
  }
}
