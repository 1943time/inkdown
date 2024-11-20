import LanguageDetector from 'i18next-browser-languagedetector'
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { locales } from './locales'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: locales,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })
export default i18n
